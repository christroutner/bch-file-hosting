/*
  LevelDB adapter. Opens a single database and exposes the invoice, file, and
  metadata stores, so use-cases never handle raw keys.
*/

import { mkdir } from 'fs/promises'
import { Level } from 'level'

import InvoiceStore from './invoice-store.js'
import FileStore from './file-store.js'
import MetaStore from './meta-store.js'

class LocalDB {
  constructor ({ config } = {}) {
    if (!config) throw new Error('LocalDB requires a config object')
    this.config = config

    // Encapsulated for unit tests.
    this.Level = Level
    this.mkdir = mkdir

    this.db = null
    this.invoices = null
    this.files = null
    this.meta = null
  }

  async open () {
    await this.mkdir(this.config.levelDbPath, { recursive: true })

    this.db = new this.Level(this.config.levelDbPath, { valueEncoding: 'json' })
    await this.db.open()

    this.invoices = new InvoiceStore({ db: this.db })
    this.files = new FileStore({ db: this.db })
    this.meta = new MetaStore({ db: this.db })
  }

  isOpen () {
    return Boolean(this.db) && this.db.status === 'open'
  }

  async close () {
    if (this.db) await this.db.close()
  }
}

export default LocalDB
