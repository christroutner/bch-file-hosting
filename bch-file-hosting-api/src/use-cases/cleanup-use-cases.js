/*
  Cleanup use-cases: delete uploads whose quote window passed without payment.
*/

import Invoice, { INVOICE_STATUS } from '../entities/invoice.js'
import { FILE_STATUS } from '../entities/file-upload.js'

const MS_PER_HOUR = 60 * 60 * 1000

class CleanupUseCases {
  constructor ({ adapters, payments } = {}) {
    if (!adapters) throw new Error('CleanupUseCases requires the adapters')
    if (!payments) throw new Error('CleanupUseCases requires the payment use-cases')
    this.adapters = adapters
    this.config = adapters.config
    this.payments = payments

    this.invoice = new Invoice()

    // Encapsulated for unit tests.
    this.now = () => new Date()

    this.deleteUnpaid = this.deleteUnpaid.bind(this)
  }

  // Check every invoice older than the quote window. Each one gets a final
  // balance check, so a payment made just before the deadline is not lost.
  // If the balance cannot be checked, the invoice is left for the next run.
  async deleteUnpaid () {
    const { localdb, wallet, logger } = this.adapters
    const cutoff = new Date(this.now().getTime() - this.config.quoteTtlHours * MS_PER_HOUR)
    const addresses = await localdb.invoices.listCreatedBefore(cutoff.toISOString())

    const summary = { checked: addresses.length, deleted: 0, rescued: 0, failed: 0 }

    for (const paymentAddress of addresses) {
      try {
        const invoice = await localdb.invoices.get(paymentAddress)
        if (!invoice) continue

        if (invoice.status !== INVOICE_STATUS.AWAITING_PAYMENT) {
          await localdb.invoices.removeCreatedIndex(invoice)
          continue
        }

        const receivedSats = await wallet.getBalanceSats(paymentAddress)
        const isPaid = this.invoice.isPaymentSufficient({
          priceSats: invoice.priceSats,
          receivedSats,
          toleranceSats: this.config.underpayToleranceSats
        })
        if (isPaid) {
          await this.payments.checkPayment({ paymentAddress })
          summary.rescued++
          continue
        }

        await this.deleteInvoice(invoice)
        summary.deleted++
      } catch (err) {
        logger.error(`Cleanup of ${paymentAddress} failed: ${err.message}`)
        summary.failed++
      }
    }

    if (summary.checked) logger.info('Unpaid upload cleanup finished', summary)
    return summary
  }

  // Remove the file's content only if this invoice still owns it. A re-upload
  // may have issued a newer invoice for the same CID, or the file may be paid.
  async deleteInvoice (invoice) {
    const { localdb, ipfs } = this.adapters

    const file = await localdb.files.get(invoice.cid)
    const ownsFile = file && file.status === FILE_STATUS.STAGED && file.paymentAddress === invoice.paymentAddress
    if (ownsFile) {
      await ipfs.remove(invoice.cid)
      await localdb.files.update(invoice.cid, { status: FILE_STATUS.DELETED })
    }

    await localdb.invoices.update(invoice.paymentAddress, {
      status: INVOICE_STATUS.DELETED,
      deletedAt: this.now().toISOString()
    })
    await localdb.invoices.removeCreatedIndex(invoice)
  }
}

export default CleanupUseCases
