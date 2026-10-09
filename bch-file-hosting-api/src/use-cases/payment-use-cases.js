/*
  Payment use-cases: check whether an invoice has been paid, then pin the file
  and sweep the payment to the treasury. Also retries sweeps that failed.
*/

import Invoice, { INVOICE_STATUS, SWEEP_STATUS } from '../entities/invoice.js'
import { FILE_STATUS } from '../entities/file-upload.js'
import UseCase from './use-case.js'
import { buildLinks } from './links.js'
import KeyedLock from './keyed-lock.js'
import { NotFoundError, ValidationError } from './errors.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

class PaymentUseCases extends UseCase {
  constructor ({ adapters } = {}) {
    super({ adapters, name: 'PaymentUseCases' })

    this.invoice = new Invoice()
    this.lock = new KeyedLock()

    // Pins run off the request path, so check-payment returns as soon as the
    // payment is recorded. The set is encapsulated for tests and graceful
    // shutdown, which can await it with whenBackgroundIdle().
    this.background = new Set()

    this.checkPayment = this.checkPayment.bind(this)
    this.retrySweeps = this.retrySweeps.bind(this)
    this.retryPins = this.retryPins.bind(this)
  }

  checkPayment ({ paymentAddress } = {}) {
    if (!paymentAddress || typeof paymentAddress !== 'string') {
      return Promise.reject(new ValidationError("Property 'paymentAddress' must be a non-empty string"))
    }
    return this.lock.run(paymentAddress, () => this.checkPaymentUnlocked(paymentAddress))
  }

  async checkPaymentUnlocked (paymentAddress) {
    const { localdb, wallet } = this.adapters

    const invoice = await localdb.invoices.get(paymentAddress)
    if (!invoice) throw new NotFoundError(`Invoice not found: ${paymentAddress}`)

    if (invoice.status === INVOICE_STATUS.PAID) return this.repayPaidInvoice(invoice)

    if (invoice.status === INVOICE_STATUS.DELETED) {
      return { status: 'expired', quoteExpiresAt: invoice.quoteExpiresAt }
    }

    // A payment that arrives after the quote window but before cleanup has
    // deleted the file is still honored.
    const receivedSats = await wallet.getBalanceSats(paymentAddress)
    const isPaid = this.invoice.isPaymentSufficient({
      priceSats: invoice.priceSats,
      receivedSats,
      toleranceSats: this.config.underpayToleranceSats
    })
    if (!isPaid) return this.unpaidResult(invoice, receivedSats)

    return this.completePayment(invoice, receivedSats)
  }

  // Idempotent: never sweep again, but finish pinning if it did not complete.
  // A file mid-pin ('pinning') is already being handled by a background task.
  async repayPaidInvoice (invoice) {
    const file = await this.adapters.localdb.files.get(invoice.cid)
    if (file.status === FILE_STATUS.PIN_FAILED) this.runInBackground(() => this.pinAndAnnounce(invoice.cid))
    return this.paidResult(invoice, file)
  }

  unpaidResult (invoice, receivedSats) {
    const now = this.now()
    if (this.invoice.isQuoteExpired({ quoteExpiresAt: invoice.quoteExpiresAt, now })) {
      return { status: 'expired', quoteExpiresAt: invoice.quoteExpiresAt }
    }
    return {
      status: 'unpaid',
      receivedSats,
      requiredSats: invoice.priceSats,
      quoteExpiresAt: invoice.quoteExpiresAt
    }
  }

  async completePayment (invoice, receivedSats) {
    const { localdb, logger } = this.adapters
    const paidAt = this.now()
    const hostedUntil = new Date(paidAt.getTime() + this.config.hostingTermDays * MS_PER_DAY)

    // Record the payment first, so a crash after this point never loses it.
    const paidInvoice = await localdb.invoices.update(invoice.paymentAddress, {
      status: INVOICE_STATUS.PAID,
      paidAt: paidAt.toISOString(),
      receivedSats
    })
    await localdb.invoices.removeCreatedIndex(paidInvoice)

    const file = await localdb.files.update(invoice.cid, {
      paymentAddress: invoice.paymentAddress,
      paidAt: paidAt.toISOString(),
      hostedUntil: hostedUntil.toISOString(),
      status: FILE_STATUS.PINNING
    })
    logger.info('Invoice paid', { paymentAddress: invoice.paymentAddress, cid: invoice.cid, receivedSats })

    // Uploads and verification are slow, so they must not stall the request.
    this.runInBackground(() => this.pinAndAnnounce(invoice.cid))
    const sweptInvoice = await this.sweep(paidInvoice)

    return this.paidResult(sweptInvoice, file)
  }

  // Re-read the file, then pin and announce it. Runs in the background after
  // payment, so it reads the latest record instead of a stale copy.
  async pinAndAnnounce (cid) {
    const file = await this.adapters.localdb.files.get(cid)
    const updated = await this.pinFile(file)
    await this.announce(updated)
    return updated
  }

  // Run a task without blocking the caller. Failures are logged, never thrown,
  // so a background pin can never reject an unhandled promise.
  runInBackground (task) {
    const promise = Promise.resolve()
      .then(task)
      .catch(err => this.adapters.logger.error(`Background pin failed: ${err.message}`))
      .finally(() => this.background.delete(promise))
    this.background.add(promise)
    return promise
  }

  // Resolve when every background task has settled. Used by tests and shutdown.
  async whenBackgroundIdle () {
    while (this.background.size > 0) await Promise.all([...this.background])
  }

  // Pin with every provider that has not already succeeded and record each
  // result. Providers already recorded as pinned are skipped, so a retry never
  // re-uploads a file that Lighthouse already has. The file is 'pinned' when
  // every authoritative provider succeeded; local/best-effort failures are
  // recorded but do not fail the file.
  async pinFile (file) {
    const { localdb, pinning, logger } = this.adapters
    const pins = [...(file.pins || [])]

    for (const provider of pinning.getProviders()) {
      const existing = pins.find(p => p.provider === provider.name)
      if (existing && existing.status === 'pinned') continue

      try {
        const result = await provider.pin(this.pinArgs(provider, file))
        this.recordPin(pins, {
          provider: provider.name,
          status: 'pinned',
          providerRef: result.providerRef ?? null,
          pinnedAt: this.now().toISOString(),
          error: null
        })
      } catch (err) {
        logger.error(`Pinning ${file.cid} with ${provider.name} failed: ${err.message}`)
        this.recordPin(pins, { provider: provider.name, status: 'failed', providerRef: null, pinnedAt: null, error: err.message })
      }
    }

    return localdb.files.update(file.cid, {
      pins,
      status: this.pinStatus(pinning.getProviders(), pins)
    })
  }

  // Upload providers receive the file bytes; every other provider pins by CID.
  pinArgs (provider, file) {
    const args = { cid: file.cid, filename: file.filename, sizeBytes: file.sizeBytes }
    if (provider.capabilities.uploadBytes) {
      args.content = this.adapters.ipfs.cat({ cid: file.cid, filename: file.filename })
    }
    return args
  }

  recordPin (pins, pin) {
    const index = pins.findIndex(p => p.provider === pin.provider)
    if (index === -1) pins.push(pin)
    else pins[index] = pin
  }

  pinStatus (providers, pins) {
    const authoritative = providers.filter(p => p.capabilities.authoritative)
    const required = authoritative.length ? authoritative : providers
    const allPinned = required.every(provider =>
      pins.some(pin => pin.provider === provider.name && pin.status === 'pinned')
    )
    return allPinned ? FILE_STATUS.PINNED : FILE_STATUS.PIN_FAILED
  }

  async announce (file) {
    try {
      await this.adapters.announcer.announce({
        cid: file.cid,
        filename: file.filename,
        sizeBytes: file.sizeBytes,
        paymentAddress: file.paymentAddress
      })
    } catch (err) {
      this.adapters.logger.error(`Announcing ${file.cid} failed: ${err.message}`)
    }
  }

  // A failed sweep never fails the payment; it is marked pending and retried.
  async sweep (invoice) {
    const { localdb, wallet, logger } = this.adapters
    try {
      const sweepTxid = await wallet.sweep(invoice.hdIndex)
      logger.info('Swept invoice payment', { paymentAddress: invoice.paymentAddress, sweepTxid })
      return localdb.invoices.update(invoice.paymentAddress, { sweepStatus: SWEEP_STATUS.SWEPT, sweepTxid })
    } catch (err) {
      logger.error(`Sweeping ${invoice.paymentAddress} failed: ${err.message}`)
      return localdb.invoices.update(invoice.paymentAddress, { sweepStatus: SWEEP_STATUS.PENDING })
    }
  }

  paidResult (invoice, file) {
    return {
      status: 'paid',
      cid: file.cid,
      filename: file.filename,
      paidAt: invoice.paidAt,
      receivedSats: invoice.receivedSats,
      hostedUntil: file.hostedUntil,
      ...buildLinks({
        cid: file.cid,
        filename: file.filename,
        config: this.config,
        providers: this.adapters.pinning.getProviders()
      })
    }
  }

  // Sweep every paid invoice that has not been swept yet.
  async retrySweeps () {
    const { localdb, wallet, logger } = this.adapters
    const paid = await localdb.invoices.list({ status: INVOICE_STATUS.PAID })
    const unswept = paid.filter(inv => inv.sweepStatus !== SWEEP_STATUS.SWEPT && inv.sweepStatus !== SWEEP_STATUS.EMPTY)

    const swept = []
    const failed = []
    const empty = []

    for (const invoice of unswept) {
      await this.lock.run(invoice.paymentAddress, async () => {
        try {
          const balance = await wallet.getBalanceSats(invoice.paymentAddress)
          if (balance === 0) {
            await localdb.invoices.update(invoice.paymentAddress, { sweepStatus: SWEEP_STATUS.EMPTY })
            empty.push(invoice.paymentAddress)
            return
          }

          const result = await this.sweep(invoice)
          if (result.sweepStatus === SWEEP_STATUS.SWEPT) swept.push(invoice.paymentAddress)
          else failed.push(invoice.paymentAddress)
        } catch (err) {
          logger.error(`Sweep retry for ${invoice.paymentAddress} failed: ${err.message}`)
          failed.push(invoice.paymentAddress)
        }
      })
    }

    return { swept, failed, empty }
  }

  // Retry the providers that failed earlier. Files whose authoritative pin is
  // already complete are left alone, except that a failed best-effort (local)
  // pin is retried without re-uploading to the providers that succeeded.
  async retryPins () {
    const all = await this.adapters.localdb.files.list()
    const needing = all.filter(file => this.needsPinRetry(file))
    const retried = []
    const pinned = []
    const failedAgain = []

    for (const file of needing) {
      const updated = await this.pinFile(file)
      retried.push(file.cid)
      if (updated.status === FILE_STATUS.PINNED) pinned.push(file.cid)
      else failedAgain.push(file.cid)
    }

    return { retried, pinned, failed: failedAgain }
  }

  needsPinRetry (file) {
    if (file.status === FILE_STATUS.PIN_FAILED) return true
    return (file.pins || []).some(pin => pin.status === 'failed')
  }
}

export default PaymentUseCases

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T19:04:10.427Z","module_hash":"81298cee095a5a5045d176a619c5f0c9ac3665803a07e4fe7b4b928a098ff166","functions":[{"id":"func/PaymentUseCases.constructor","name":"PaymentUseCases.constructor","line":16,"end_line":30,"hash":"e566ea31ebe602dc7dc6f617f734a691890aab48cfe71a402a6212ce73966d56"},{"id":"func/PaymentUseCases.checkPayment","name":"PaymentUseCases.checkPayment","line":32,"end_line":37,"hash":"009479f5933624a6d4fe9de74cfb227a7e3147fc72f1dc51171e6bc025803688"},{"id":"func/PaymentUseCases.checkPaymentUnlocked","name":"PaymentUseCases.checkPaymentUnlocked","line":39,"end_line":62,"hash":"fc6b02056ee02239a255a5e7d55f753c315dc860c2eaacd51c5963f3f4ad7a03"},{"id":"func/PaymentUseCases.repayPaidInvoice","name":"PaymentUseCases.repayPaidInvoice","line":66,"end_line":70,"hash":"d401ac1a92184c07ee7656fd975fd80a1813436da77d1b502741c53f24601e77"},{"id":"func/PaymentUseCases.unpaidResult","name":"PaymentUseCases.unpaidResult","line":72,"end_line":83,"hash":"4298640b0d46cb12737adcd3c5bf7a34005e107bbfd80ff5081012fb61407cda"},{"id":"func/PaymentUseCases.completePayment","name":"PaymentUseCases.completePayment","line":85,"end_line":111,"hash":"7f2254a0e5cab97c3a98b2cde6638f6f0c7831983d53ee4359e691837b549761"},{"id":"func/PaymentUseCases.pinAndAnnounce","name":"PaymentUseCases.pinAndAnnounce","line":115,"end_line":120,"hash":"3c0b36794ae7ce7c6b7303cb15a740c64118063b3a8bcbb45b3e64c30d4464c0"},{"id":"func/PaymentUseCases.runInBackground","name":"PaymentUseCases.runInBackground","line":124,"end_line":131,"hash":"9a6ab3d22e63d5464a481e5b3cc30c4c77f45e9818472306981b0e826ebd54f5"},{"id":"func/PaymentUseCases.whenBackgroundIdle","name":"PaymentUseCases.whenBackgroundIdle","line":134,"end_line":136,"hash":"90b9ada9a7381f392ad71bd73ac84ec11aff8967ba660514a49f69159d389e93"},{"id":"func/PaymentUseCases.pinFile","name":"PaymentUseCases.pinFile","line":143,"end_line":170,"hash":"090ec271513d858460524158d67bab2616c84ed0a7873b30369e5ba4d7464011"},{"id":"func/PaymentUseCases.pinArgs","name":"PaymentUseCases.pinArgs","line":173,"end_line":179,"hash":"f7ee90e5cfef03a018a5364fae54a82a7f336ab7169963d43166b57879f8ee93"},{"id":"func/PaymentUseCases.recordPin","name":"PaymentUseCases.recordPin","line":181,"end_line":185,"hash":"dc95f11f5942344aca1ca19cce5d300ce1b5ba5be90581d4cde1cdfb15e21939"},{"id":"func/PaymentUseCases.pinStatus","name":"PaymentUseCases.pinStatus","line":187,"end_line":194,"hash":"7a975c7bf6d7bdf01671e50b97d8aceb938dc99fbc44e7b320ab25f746620ece"},{"id":"func/PaymentUseCases.announce","name":"PaymentUseCases.announce","line":196,"end_line":207,"hash":"a69cbf94607ba6f11f16679a9ffba11e02270cbcdba28a9ef1c0aa0794438b65"},{"id":"func/PaymentUseCases.sweep","name":"PaymentUseCases.sweep","line":210,"end_line":220,"hash":"cafbab4da3a6c7dfe88aa6c857cca21d6741b2dbf39cd2ba84e48487aad706b2"},{"id":"func/PaymentUseCases.paidResult","name":"PaymentUseCases.paidResult","line":222,"end_line":237,"hash":"66df8c09b2e22907e002f1dc3b142b2da1a36c49e53b28fb516ec0b9aed334fb"},{"id":"func/PaymentUseCases.retrySweeps","name":"PaymentUseCases.retrySweeps","line":240,"end_line":270,"hash":"a2bfb0169b54b54cbd69eee025e135ebab6dce4012d12681e1067d8f85876365"},{"id":"func/PaymentUseCases.retryPins","name":"PaymentUseCases.retryPins","line":275,"end_line":290,"hash":"dc99ad80b0440086fa6bb5ff5e002b57a00f367e031871d3d11801b545c1a80d"},{"id":"func/PaymentUseCases.needsPinRetry","name":"PaymentUseCases.needsPinRetry","line":292,"end_line":295,"hash":"abd3411d83b064bbc896dcdebc1a997bf4cb1a0350a137f68fdb007ce649496e"}]}
// mutate4javascript-manifest-end
