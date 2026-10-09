/*
  LevelDB store for invoices. Each invoice is saved under
  invoice:<paymentAddress>, plus an index key idx:created:<createdAt>:<address>
  so the cleanup timer can range-scan invoices by age.
*/

const INVOICE_PREFIX = 'invoice:'
const CREATED_PREFIX = 'idx:created:'

// ':' is followed by ';' in ASCII, so '<prefix minus colon>;' is the end of the range.
function prefixRange (prefix) {
  return { gte: prefix, lt: prefix.slice(0, -1) + ';' }
}

class InvoiceStore {
  constructor ({ db } = {}) {
    if (!db) throw new Error('InvoiceStore requires a db instance')
    this.db = db
  }

  invoiceKey (paymentAddress) {
    return `${INVOICE_PREFIX}${paymentAddress}`
  }

  createdKey (createdAt, paymentAddress) {
    return `${CREATED_PREFIX}${createdAt}:${paymentAddress}`
  }

  // Save a new invoice and its cleanup index entry atomically.
  async create (invoice) {
    await this.db.batch([
      { type: 'put', key: this.invoiceKey(invoice.paymentAddress), value: invoice },
      { type: 'put', key: this.createdKey(invoice.createdAt, invoice.paymentAddress), value: invoice.paymentAddress }
    ])
    return invoice
  }

  async get (paymentAddress) {
    const invoice = await this.db.get(this.invoiceKey(paymentAddress))
    return invoice === undefined ? null : invoice
  }

  // Merge changes into an existing invoice. Returns the updated invoice.
  async update (paymentAddress, changes) {
    const invoice = await this.get(paymentAddress)
    if (!invoice) throw new Error(`Invoice not found: ${paymentAddress}`)

    const updated = { ...invoice, ...changes, paymentAddress }
    await this.db.put(this.invoiceKey(paymentAddress), updated)
    return updated
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
