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
}

export default PaymentUseCases
