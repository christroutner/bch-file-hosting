/*
  Shared LevelDB access for stores that keep one JSON record per id. A subclass
  supplies the key prefix, a human-readable label for errors, and the property
  that identifies a record.
*/

class RecordStore {
  constructor ({ db, prefix, label, idField } = {}) {
    if (!db) throw new Error(`${label}Store requires a db instance`)
    this.db = db
    this.prefix = prefix
    this.label = label
    this.idField = idField
  }

  recordKey (id) {
    return `${this.prefix}${id}`
  }

  async get (id) {
    const record = await this.db.get(this.recordKey(id))
    return record === undefined ? null : record
  }

  // Merge changes into an existing record. Returns the updated record.
  async update (id, changes) {
    const record = await this.get(id)
    if (!record) throw new Error(`${this.label} not found: ${id}`)

    const updated = { ...record, ...changes, [this.idField]: id }
    await this.db.put(this.recordKey(id), updated)
    return updated
  }
}

export default RecordStore
