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

  // Read every record under this store's prefix. ':' is followed by ';' in
  // ASCII, so '<prefix minus colon>;' is the exclusive end of the range.
  async listAll () {
    const range = { gte: this.prefix, lt: this.prefix.slice(0, -1) + ';' }
    const records = []
    for await (const record of this.db.values(range)) {
      records.push(record)
    }
    return records
  }
}

export default RecordStore

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T03:18:06.541Z","module_hash":"715183bb340d53af0442d35f87df33baf26eaa742042b6389e2f95876af47841","functions":[{"id":"func/RecordStore.constructor","name":"RecordStore.constructor","line":8,"end_line":14,"hash":"35b903480dccc0129df2a8bfb16426cebed64b5c9bac026a071a1e6f26136756"},{"id":"func/RecordStore.recordKey","name":"RecordStore.recordKey","line":16,"end_line":18,"hash":"8bbe14b7d48a6bd365158995ac3dd99e5a64c425286593483624acdb62686d37"},{"id":"func/RecordStore.get","name":"RecordStore.get","line":20,"end_line":23,"hash":"e7312fb1dbd4c82d27fc50b95ebb875813b0a98dd221bb7dd996dd60495be571"},{"id":"func/RecordStore.update","name":"RecordStore.update","line":26,"end_line":33,"hash":"60a65dc3b7b019dc495905b9066168835684993f39158244893d1055d965fc78"},{"id":"func/RecordStore.listAll","name":"RecordStore.listAll","line":37,"end_line":44,"hash":"0f4e5b03129eb80d8d7034745407a4693e5147b5be6d8796732308e008bf3e75"}]}
// mutate4javascript-manifest-end
