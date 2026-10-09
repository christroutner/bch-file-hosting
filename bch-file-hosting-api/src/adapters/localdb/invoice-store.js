/*
  LevelDB store for invoices. Each invoice is saved under
  invoice:<paymentAddress>, plus an index key idx:created:<createdAt>:<address>
  so the cleanup timer can range-scan invoices by age.
*/

import RecordStore from './record-store.js'

const INVOICE_PREFIX = 'invoice:'
const CREATED_PREFIX = 'idx:created:'

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
    const invoices = await this.listAll()
    return invoices.filter(invoice => {
      if (status && invoice.status !== status) return false
      if (sweepStatus && invoice.sweepStatus !== sweepStatus) return false
      return true
    })
  }
}

export default InvoiceStore

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T03:17:59.767Z","module_hash":"f903d393435880c5eee0a803a2c22c28d721317d065384325f9e9fa074b8eb05","functions":[{"id":"func/InvoiceStore.constructor","name":"InvoiceStore.constructor","line":13,"end_line":15,"hash":"44f1a2e4aa0f4094a209d31006a148bd85c3674b963d06b186da9ac39edbdf7c"},{"id":"func/InvoiceStore.createdKey","name":"InvoiceStore.createdKey","line":17,"end_line":19,"hash":"77572928cf9127e0067efd47b73afd166a951afbe659cccea855cba134c4e25f"},{"id":"func/InvoiceStore.create","name":"InvoiceStore.create","line":22,"end_line":28,"hash":"8c15a870d4273227a6da51b330c063abbf48462e506ee13176e7992cc3743fde"},{"id":"func/InvoiceStore.listCreatedBefore","name":"InvoiceStore.listCreatedBefore","line":31,"end_line":38,"hash":"a53ea7f10ccf263e976b6574bab07d1ea06205350bf8c8ebdbf19af75fbaf0db"},{"id":"func/InvoiceStore.removeCreatedIndex","name":"InvoiceStore.removeCreatedIndex","line":40,"end_line":42,"hash":"a16eca63f97212810fa6199a06cbd43fefede75e4d1d580f41173b0b73fec7b0"},{"id":"func/InvoiceStore.list","name":"InvoiceStore.list","line":45,"end_line":52,"hash":"cd07995ad4a73c27ff95ed8bc0c737cfe32aae30271f305c5e3993da3e68b6f7"}]}
// mutate4javascript-manifest-end
