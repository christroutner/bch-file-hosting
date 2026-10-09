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
