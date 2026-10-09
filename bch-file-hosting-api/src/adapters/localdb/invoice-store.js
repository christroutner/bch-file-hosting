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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:20:57.657Z","module_hash":"4efecf1d3c56e6eb12b268bfdfacfff2050e31637821df3460aceb5ca385afb1","functions":[{"id":"func/prefixRange","name":"prefixRange","line":13,"end_line":15,"hash":"b6b48ebb99815c416b8570a61a3e9acf48c38cc4067195fc30394dce30b29a03"},{"id":"func/InvoiceStore.constructor","name":"InvoiceStore.constructor","line":18,"end_line":20,"hash":"44f1a2e4aa0f4094a209d31006a148bd85c3674b963d06b186da9ac39edbdf7c"},{"id":"func/InvoiceStore.createdKey","name":"InvoiceStore.createdKey","line":22,"end_line":24,"hash":"77572928cf9127e0067efd47b73afd166a951afbe659cccea855cba134c4e25f"},{"id":"func/InvoiceStore.create","name":"InvoiceStore.create","line":27,"end_line":33,"hash":"8c15a870d4273227a6da51b330c063abbf48462e506ee13176e7992cc3743fde"},{"id":"func/InvoiceStore.listCreatedBefore","name":"InvoiceStore.listCreatedBefore","line":36,"end_line":43,"hash":"a53ea7f10ccf263e976b6574bab07d1ea06205350bf8c8ebdbf19af75fbaf0db"},{"id":"func/InvoiceStore.removeCreatedIndex","name":"InvoiceStore.removeCreatedIndex","line":45,"end_line":47,"hash":"a16eca63f97212810fa6199a06cbd43fefede75e4d1d580f41173b0b73fec7b0"},{"id":"func/InvoiceStore.list","name":"InvoiceStore.list","line":50,"end_line":58,"hash":"aeae5f48d6490b259792768ec57122e7ae5e4401e44389c82a2925036771ae16"}]}
// mutate4javascript-manifest-end
