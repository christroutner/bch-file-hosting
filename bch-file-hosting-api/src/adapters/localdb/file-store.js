/*
  LevelDB store for hosted file records, keyed by file:<cid>.
*/

const FILE_PREFIX = 'file:'

class FileStore {
  constructor ({ db } = {}) {
    if (!db) throw new Error('FileStore requires a db instance')
    this.db = db
  }

  fileKey (cid) {
    return `${FILE_PREFIX}${cid}`
  }

  async put (file) {
    await this.db.put(this.fileKey(file.cid), file)
    return file
  }

  async get (cid) {
    const file = await this.db.get(this.fileKey(cid))
    return file === undefined ? null : file
  }

  // Merge changes into an existing file record. Returns the updated record.
  async update (cid, changes) {
    const file = await this.get(cid)
    if (!file) throw new Error(`File not found: ${cid}`)

    const updated = { ...file, ...changes, cid }
    await this.db.put(this.fileKey(cid), updated)
    return updated
  }
}

export default FileStore
