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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:21:10.560Z","module_hash":"2a1742b850c4688dd33fc82f47fc7f9505b642235e1cd99541cb8b04028383b9","functions":[{"id":"func/LocalDB.constructor","name":"LocalDB.constructor","line":14,"end_line":26,"hash":"5614371f6c32c5319d0b0e8a2a72c7c0108e178fc98a96b9842a84522c3d0777"},{"id":"func/LocalDB.open","name":"LocalDB.open","line":28,"end_line":37,"hash":"119790691009ae2416ba8955d3faaf417f83ac0c29038c9fb81a98c3d26aa05c"},{"id":"func/LocalDB.isOpen","name":"LocalDB.isOpen","line":39,"end_line":41,"hash":"bfd1912ed0ec1fa11df724407dff47c67915c523f78ff3bc1fda27235f76aedc"},{"id":"func/LocalDB.close","name":"LocalDB.close","line":43,"end_line":45,"hash":"eaee55ffa17b3143cba00fbd407ba5cacc776bdd9244efc22eebbf07e1e57a38"}]}
// mutate4javascript-manifest-end
