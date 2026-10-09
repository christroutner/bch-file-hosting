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
  async repayPaidInvoice (invoice) {
    let file = await this.adapters.localdb.files.get(invoice.cid)
    if (file.status !== FILE_STATUS.PINNED) file = await this.pinFile(file)
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

    let file = await localdb.files.update(invoice.cid, {
      paymentAddress: invoice.paymentAddress,
      paidAt: paidAt.toISOString(),
      hostedUntil: hostedUntil.toISOString()
    })
    logger.info('Invoice paid', { paymentAddress: invoice.paymentAddress, cid: invoice.cid, receivedSats })

    file = await this.pinFile(file)
    await this.announce(file)
    const sweptInvoice = await this.sweep(paidInvoice)

    return this.paidResult(sweptInvoice, file)
  }

  // Pin with every provider and record each result. The file is 'pinned' only
  // if all providers succeed.
  async pinFile (file) {
    const { localdb, pinning, logger } = this.adapters

    const pins = []
    for (const provider of pinning.getProviders()) {
      try {
        const result = await provider.pin({ cid: file.cid, filename: file.filename, sizeBytes: file.sizeBytes })
        pins.push({
          provider: provider.name,
          status: 'pinned',
          providerRef: result.providerRef ?? null,
          pinnedAt: this.now().toISOString(),
          error: null
        })
      } catch (err) {
        logger.error(`Pinning ${file.cid} with ${provider.name} failed: ${err.message}`)
        pins.push({ provider: provider.name, status: 'failed', providerRef: null, pinnedAt: null, error: err.message })
      }
    }

    const allPinned = pins.every(p => p.status === 'pinned')
    return localdb.files.update(file.cid, {
      pins,
      status: allPinned ? FILE_STATUS.PINNED : FILE_STATUS.PIN_FAILED
    })
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

  // Retry pinning for files whose earlier pinning failed. Files that are
  // already pinned or still staged are left alone.
  async retryPins () {
    const failed = await this.adapters.localdb.files.list({ status: FILE_STATUS.PIN_FAILED })
    const retried = []
    const pinned = []
    const failedAgain = []

    for (const file of failed) {
      const updated = await this.pinFile(file)
      retried.push(file.cid)
      if (updated.status === FILE_STATUS.PINNED) pinned.push(file.cid)
      else failedAgain.push(file.cid)
    }

    return { retried, pinned, failed: failedAgain }
  }
}

export default PaymentUseCases

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:26:08.380Z","module_hash":"788fd8cf218cd7808eb7d2aff1e6b9db02c51818fd8ef4733179fb92c44ec657","functions":[{"id":"func/PaymentUseCases.constructor","name":"PaymentUseCases.constructor","line":16,"end_line":24,"hash":"fa69d124de577c86085de2d6288c0a031a0e7843472261c63ea4a0f9ceff9e1e"},{"id":"func/PaymentUseCases.checkPayment","name":"PaymentUseCases.checkPayment","line":26,"end_line":31,"hash":"009479f5933624a6d4fe9de74cfb227a7e3147fc72f1dc51171e6bc025803688"},{"id":"func/PaymentUseCases.checkPaymentUnlocked","name":"PaymentUseCases.checkPaymentUnlocked","line":33,"end_line":56,"hash":"fc6b02056ee02239a255a5e7d55f753c315dc860c2eaacd51c5963f3f4ad7a03"},{"id":"func/PaymentUseCases.repayPaidInvoice","name":"PaymentUseCases.repayPaidInvoice","line":59,"end_line":63,"hash":"2f1a8f5b34875700caffbcd4be24ef11617ab8b41ed2772de23525c8e514ff06"},{"id":"func/PaymentUseCases.unpaidResult","name":"PaymentUseCases.unpaidResult","line":65,"end_line":76,"hash":"4298640b0d46cb12737adcd3c5bf7a34005e107bbfd80ff5081012fb61407cda"},{"id":"func/PaymentUseCases.completePayment","name":"PaymentUseCases.completePayment","line":78,"end_line":103,"hash":"fa09093f6c006b725e07aefc568c5b4464dda5777f54cae053a7053d6e0df38f"},{"id":"func/PaymentUseCases.pinFile","name":"PaymentUseCases.pinFile","line":107,"end_line":132,"hash":"a2c2ac9d02e4b1f02d4bb5dd122727229497c58368cff897d7f6db5b5b077d69"},{"id":"func/PaymentUseCases.announce","name":"PaymentUseCases.announce","line":134,"end_line":145,"hash":"a69cbf94607ba6f11f16679a9ffba11e02270cbcdba28a9ef1c0aa0794438b65"},{"id":"func/PaymentUseCases.sweep","name":"PaymentUseCases.sweep","line":148,"end_line":158,"hash":"cafbab4da3a6c7dfe88aa6c857cca21d6741b2dbf39cd2ba84e48487aad706b2"},{"id":"func/PaymentUseCases.paidResult","name":"PaymentUseCases.paidResult","line":160,"end_line":175,"hash":"66df8c09b2e22907e002f1dc3b142b2da1a36c49e53b28fb516ec0b9aed334fb"},{"id":"func/PaymentUseCases.retrySweeps","name":"PaymentUseCases.retrySweeps","line":178,"end_line":208,"hash":"a2bfb0169b54b54cbd69eee025e135ebab6dce4012d12681e1067d8f85876365"}]}
// mutate4javascript-manifest-end
