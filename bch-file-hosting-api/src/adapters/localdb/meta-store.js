/*
  LevelDB store for service metadata, such as the next HD wallet index to use
  for an invoice address.
*/

const NEXT_HD_INDEX_KEY = 'meta:nextHdIndex'

// Index 0 is the server's main wallet, so invoice addresses start at 1.
const FIRST_INVOICE_HD_INDEX = 1

class MetaStore {
  constructor ({ db } = {}) {
    if (!db) throw new Error('MetaStore requires a db instance')
    this.db = db

    // Serializes nextHdIndex() calls so concurrent uploads never share an index.
    this.hdIndexLock = Promise.resolve()

    this.nextHdIndex = this.nextHdIndex.bind(this)
  }

  // Reserve and return the next unused HD index.
  nextHdIndex () {
    const reservation = this.hdIndexLock.then(() => this.reserveHdIndex())
    this.hdIndexLock = reservation.catch(() => {})
    return reservation
  }

  async reserveHdIndex () {
    const stored = await this.db.get(NEXT_HD_INDEX_KEY)
    const hdIndex = stored === undefined ? FIRST_INVOICE_HD_INDEX : stored

    await this.db.put(NEXT_HD_INDEX_KEY, hdIndex + 1)
    return hdIndex
  }
}

export default MetaStore

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:21:04.158Z","module_hash":"70504bcb28eaec1361792fc48d34908e4378f0cde35b51e297dc12e610644856","functions":[{"id":"func/MetaStore.constructor","name":"MetaStore.constructor","line":12,"end_line":20,"hash":"d8a9a3f144fe9fc075b47ca7b026f1d53fcc05eac1b23ff2c02df2afcfde2c75"},{"id":"func/MetaStore.nextHdIndex","name":"MetaStore.nextHdIndex","line":23,"end_line":27,"hash":"dc17552b8c018315d961acfbe5e019ae8b595abfb7ece64a3c05ff8123295720"},{"id":"func/MetaStore.reserveHdIndex","name":"MetaStore.reserveHdIndex","line":29,"end_line":35,"hash":"b3e1723e8851a343b9484fb217010aeddc44243e3ae68b3caa40c492ae01dde6"}]}
// mutate4javascript-manifest-end
