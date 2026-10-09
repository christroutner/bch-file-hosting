/*
  LevelDB store for hosted file records, keyed by file:<cid>.
*/

import RecordStore from './record-store.js'

const FILE_PREFIX = 'file:'

class FileStore extends RecordStore {
  constructor ({ db } = {}) {
    super({ db, prefix: FILE_PREFIX, label: 'File', idField: 'cid' })
  }

  async put (file) {
    await this.db.put(this.recordKey(file.cid), file)
    return file
  }
}

export default FileStore
