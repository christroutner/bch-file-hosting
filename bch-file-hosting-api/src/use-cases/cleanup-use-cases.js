/*
  Cleanup use-cases: delete uploads whose quote window passed without payment.
*/

import Invoice, { INVOICE_STATUS } from '../entities/invoice.js'
import { FILE_STATUS } from '../entities/file-upload.js'
import UseCase from './use-case.js'

const MS_PER_HOUR = 60 * 60 * 1000

class CleanupUseCases extends UseCase {
  constructor ({ adapters, payments } = {}) {
    super({ adapters, name: 'CleanupUseCases' })
    if (!payments) throw new Error('CleanupUseCases requires the payment use-cases')
    this.payments = payments

    this.invoice = new Invoice()

    this.deleteUnpaid = this.deleteUnpaid.bind(this)
  }

  // Check every invoice older than the quote window. Each one gets a final
  // balance check, so a payment made just before the deadline is not lost.
  // If the balance cannot be checked, the invoice is left for the next run.
  async deleteUnpaid () {
    const { localdb, logger } = this.adapters
    const cutoff = new Date(this.now().getTime() - this.config.quoteTtlHours * MS_PER_HOUR)
    const addresses = await localdb.invoices.listCreatedBefore(cutoff.toISOString())

    const summary = { checked: addresses.length, deleted: 0, rescued: 0, failed: 0 }

    for (const paymentAddress of addresses) {
      await this.cleanupOne(paymentAddress, summary)
    }

    if (summary.checked) logger.info('Unpaid upload cleanup finished', summary)
    return summary
  }

  // Handle one overdue invoice: drop a stale index entry, rescue a payment that
  // arrived just before the deadline, or delete the unpaid file. A failure is
  // counted and never stops the rest of the run.
  async cleanupOne (paymentAddress, summary) {
    const { localdb, wallet, logger } = this.adapters

    try {
      const invoice = await localdb.invoices.get(paymentAddress)
      if (!invoice) return

      if (invoice.status !== INVOICE_STATUS.AWAITING_PAYMENT) {
        await localdb.invoices.removeCreatedIndex(invoice)
        return
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
        return
      }

      await this.deleteInvoice(invoice)
      summary.deleted++
    } catch (err) {
      logger.error(`Cleanup of ${paymentAddress} failed: ${err.message}`)
      summary.failed++
    }
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:19:52.632Z","module_hash":"e23e9999cfbf0f4c15cd8df3cecb8bf0f7243e22c06b5fae322b70351452ed48","functions":[{"id":"func/CleanupUseCases.constructor","name":"CleanupUseCases.constructor","line":12,"end_line":20,"hash":"9a62b3a7e3da80cd83d5df646f65192e445a2339f5a7935cfa1aa1f8f4fe5ee9"},{"id":"func/CleanupUseCases.deleteUnpaid","name":"CleanupUseCases.deleteUnpaid","line":25,"end_line":38,"hash":"36aeaa71f4e655e7753f8aec81c0050e391486e228ec73190c0efcb1708f60af"},{"id":"func/CleanupUseCases.cleanupOne","name":"CleanupUseCases.cleanupOne","line":43,"end_line":73,"hash":"2b207a501e376a63db73e59a32f2e29f7ae88026dc008e8f8e4a9805e4535471"},{"id":"func/CleanupUseCases.deleteInvoice","name":"CleanupUseCases.deleteInvoice","line":77,"end_line":92,"hash":"da9f68b9e4f6f88acb6537aef987444fe1d7a47e732ecdb4bec6596b91e70c98"}]}
// mutate4javascript-manifest-end
