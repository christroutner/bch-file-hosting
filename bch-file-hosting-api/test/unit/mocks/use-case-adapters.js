/*
  Adapters for use-case unit tests: the real LevelDB stores on an in-memory
  database, with the wallet, IPFS node, pinning providers, announcer, and
  logger replaced by Sinon stubs.
*/

import { MemoryLevel } from 'memory-level'

import InvoiceStore from '../../../src/adapters/localdb/invoice-store.js'
import FileStore from '../../../src/adapters/localdb/file-store.js'
import MetaStore from '../../../src/adapters/localdb/meta-store.js'

const BECH32_CHARS = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

// A syntactically valid cash address that is unique for each HD index.
export function fakeAddress (hdIndex) {
  let n = hdIndex
  let body = ''
  do {
    body = BECH32_CHARS[n % 32] + body
    n = Math.floor(n / 32)
  } while (n > 0)
  return `bitcoincash:q${body.padStart(41, 'p')}`
}

export const TEST_CID = 'bafybeieynlvdkpvdjap7fn6h5xzsu4v3li2pjlpw5qrkkljqd4bx275zbq'

export function makeConfig (overrides = {}) {
  return {
    publicUrl: 'http://localhost:5050',
    publicGateways: ['https://ipfs.io/ipfs/'],
    usdPerMbYear: 0.01,
    minBilledBytes: 100000,
    minInvoiceSats: 2000,
    underpayToleranceSats: 100,
    quoteTtlHours: 24,
    hostingTermDays: 365,
    maxFileSizeBytes: 100000000,
    ...overrides
  }
}

export function makeProvider (sandbox, name, gateway = null, capabilities = {}) {
  return {
    name,
    capabilities: { pinByCid: true, uploadBytes: false, unpin: true, authoritative: false, ...capabilities },
    pin: sandbox.stub().resolves({ providerCid: TEST_CID, providerRef: null }),
    gatewayUrl: (cid) => (gateway ? `${gateway}${cid}` : null)
  }
}

export async function makeAdapters (sandbox, configOverrides = {}) {
  const db = new MemoryLevel({ valueEncoding: 'json' })
  await db.open()

  const providers = [makeProvider(sandbox, 'local-helia')]

  return {
    db,
    config: makeConfig(configOverrides),
    localdb: {
      invoices: new InvoiceStore({ db }),
      files: new FileStore({ db }),
      meta: new MetaStore({ db })
    },
    wallet: {
      getUsdPerBch: sandbox.stub().resolves(400),
      getKeyPair: sandbox.stub().callsFake(async (hdIndex) => ({ cashAddress: fakeAddress(hdIndex), wif: 'wif', hdIndex })),
      getBalanceSats: sandbox.stub().resolves(0),
      sweep: sandbox.stub().resolves('sweep-txid')
    },
    ipfs: {
      addFile: sandbox.stub().resolves(TEST_CID),
      remove: sandbox.stub().resolves(2),
      cat: sandbox.stub().returns('content-stream')
    },
    pinning: {
      providers,
      getProviders () { return [...this.providers] }
    },
    announcer: { announce: sandbox.stub().resolves({ announced: false, txid: null }) },
    logger: { info: sandbox.stub(), error: sandbox.stub(), debug: sandbox.stub() }
  }
}
