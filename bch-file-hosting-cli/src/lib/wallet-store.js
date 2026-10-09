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

// Wallet names become `<name>.json` files in the local store, so restrict them
// to characters that cannot escape the store directory. The grammar lives here,
// next to the representation it protects, so no caller can build a path outside
// the store.
const WALLET_NAME_PATTERN = /^[A-Za-z0-9_-]+$/

function isValidWalletName (name) {
  return typeof name === 'string' && WALLET_NAME_PATTERN.test(name)
}

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
    if (!isValidWalletName(name)) {
      throw new Error(`Invalid wallet name "${name}".`)
    }

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

export { isValidWalletName }
export default WalletStore

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T13:21:55.375Z","module_hash":"ceee7a8f212628e0ec96b390d692b3a202d50613e6844061ce667ed49890a3cc","functions":[{"id":"func/isValidWalletName","name":"isValidWalletName","line":23,"end_line":25,"hash":"b8706b9dd89ba61fd266686cd38b1b94bea670a6819bba6627e9016550d39077"},{"id":"func/WalletStore.constructor","name":"WalletStore.constructor","line":28,"end_line":39,"hash":"a9f16744d112382351e8c2090ca45fe65a134294cbcca795edb7c145a554777f"},{"id":"func/WalletStore.filePath","name":"WalletStore.filePath","line":41,"end_line":47,"hash":"19702d1ab45ff8b007a648273c19b2fe921d2e63f8cfbd3709e077ba1d830093"},{"id":"func/WalletStore.has","name":"WalletStore.has","line":49,"end_line":51,"hash":"e511e037250569b1bdcdcd163cf3c84b33449a550ea8f2786399c2406224121f"},{"id":"func/WalletStore.read","name":"WalletStore.read","line":53,"end_line":59,"hash":"39e48027329e040eecc1c9c8dcf2136c31cac69ee4f26f7cc13e2b8a7c647b86"},{"id":"func/WalletStore.write","name":"WalletStore.write","line":61,"end_line":64,"hash":"4a97fbac8d006d7cea826bbe2872ead561e6991db241852b2ac7f76146211b88"}]}
// mutate4javascript-manifest-end
