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
  }
}

export default WalletStore

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T04:09:18.981Z","module_hash":"e3dbe5a29081c378a5e58df9e9b4bd0d19281a1ae99c8b258796cf4be7ade0cf","functions":[{"id":"func/WalletStore.constructor","name":"WalletStore.constructor","line":18,"end_line":29,"hash":"a9f16744d112382351e8c2090ca45fe65a134294cbcca795edb7c145a554777f"},{"id":"func/WalletStore.filePath","name":"WalletStore.filePath","line":31,"end_line":33,"hash":"56695ad8f292466d353dcf02754f0ed308f1855edcc81cbca6e0df174d0ae9a1"},{"id":"func/WalletStore.has","name":"WalletStore.has","line":35,"end_line":37,"hash":"e511e037250569b1bdcdcd163cf3c84b33449a550ea8f2786399c2406224121f"},{"id":"func/WalletStore.read","name":"WalletStore.read","line":39,"end_line":45,"hash":"39e48027329e040eecc1c9c8dcf2136c31cac69ee4f26f7cc13e2b8a7c647b86"},{"id":"func/WalletStore.write","name":"WalletStore.write","line":47,"end_line":50,"hash":"4a97fbac8d006d7cea826bbe2872ead561e6991db241852b2ac7f76146211b88"}]}
// mutate4javascript-manifest-end
