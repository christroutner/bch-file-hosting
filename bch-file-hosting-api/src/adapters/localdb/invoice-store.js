/*
  LevelDB store for invoices. Each invoice is saved under
  invoice:<paymentAddress>, plus an index key idx:created:<createdAt>:<address>
  so the cleanup timer can range-scan invoices by age.
*/

import RecordStore from './record-store.js'

const INVOICE_PREFIX = 'invoice:'
const CREATED_PREFIX = 'idx:created:'

// ':' is followed by ';' in ASCII, so '<prefix minus colon>;' is the end of the range.
function prefixRange (prefix) {
  return { gte: prefix, lt: prefix.slice(0, -1) + ';' }
}

class InvoiceStore extends RecordStore {
  constructor ({ db } = {}) {
    super({ db, prefix: INVOICE_PREFIX, label: 'Invoice', idField: 'paymentAddress' })
  }

  createdKey (createdAt, paymentAddress) {
    return `${CREATED_PREFIX}${createdAt}:${paymentAddress}`
  }

  // Save a new invoice and its cleanup index entry atomically.
  async create (invoice) {
    await this.db.batch([
      { type: 'put', key: this.recordKey(invoice.paymentAddress), value: invoice },
      { type: 'put', key: this.createdKey(invoice.createdAt, invoice.paymentAddress), value: invoice.paymentAddress }
    ])
    return invoice
  }

  // Return the payment addresses of invoices created before the given ISO time.
  async listCreatedBefore (isoTime) {
    const addresses = []
    const range = { gte: CREATED_PREFIX, lt: `${CREATED_PREFIX}${isoTime}` }
    for await (const value of this.db.values(range)) {
      addresses.push(value)
    }
    return addresses
  }

  async removeCreatedIndex ({ createdAt, paymentAddress }) {
    await this.db.del(this.createdKey(createdAt, paymentAddress))
  }

  // List invoices, optionally filtered by status and/or sweepStatus.
  async list ({ status, sweepStatus } = {}) {
    const invoices = []
    for await (const invoice of this.db.values(prefixRange(INVOICE_PREFIX))) {
      if (status && invoice.status !== status) continue
      if (sweepStatus && invoice.sweepStatus !== sweepStatus) continue
      invoices.push(invoice)
    }
    return invoices
  }
}

export default InvoiceStore
