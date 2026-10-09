/*
  Local wallet store.

  Persists named wallets as `<name>.json` files under a gitignored `.wallets/`
  directory, matching the psf-bch-wallet v3 store layout. Each file holds
  `{ wallet: <minimal-slp-wallet walletInfo> }`.
*/

// Global npm libraries
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DIR = path.resolve(__dirname, '..', '..', '.wallets')

class WalletStore {
  constructor ({ dir = DEFAULT_DIR, fs: fileSystem = fs } = {}) {
    // Encapsulate dependencies so tests can replace them.
    this.dir = dir
    this.fs = fileSystem
    this.path = path

    // Bind 'this' object to all subfunctions.
    this.filePath = this.filePath.bind(this)
    this.has = this.has.bind(this)
    this.read = this.read.bind(this)
    this.write = this.write.bind(this)
  }

  filePath (name) {
    return this.path.join(this.dir, `${name}.json`)
  }

  has (name) {
    return this.fs.existsSync(this.filePath(name))
  }

  read (name) {
    const file = this.filePath(name)
    if (!this.fs.existsSync(file)) return null

    const data = JSON.parse(this.fs.readFileSync(file, 'utf8'))
    return data.wallet || null
  }

  write (name, wallet) {
    this.fs.mkdirSync(this.dir, { recursive: true })
    this.fs.writeFileSync(this.filePath(name), JSON.stringify({ wallet }, null, 2))
    return true
  }
}

export default WalletStore
