/*
  Property tests for the local wallet store (src/lib/wallet-store.js).

  Invariants: every stored wallet round-trips under its name, an unwritten name
  is absent, and a stored file without a `wallet` key reads back as null.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import WalletStore from '../../src/lib/wallet-store.js'
import { forAll, randomString, randomWallet } from './lib/harness.js'

// An in-memory fs so arbitrary names and bytes never touch disk.
function makeFakeFs () {
  const files = new Map()
  return {
    files,
    existsSync: (file) => files.has(file),
    readFileSync: (file) => {
      if (!files.has(file)) throw new Error(`ENOENT: ${file}`)
      return files.get(file)
    },
    writeFileSync: (file, data) => { files.set(file, data) },
    mkdirSync: () => {}
  }
}

function store () {
  return new WalletStore({ dir: '/wallets', fs: makeFakeFs() })
}

describe('#wallet-store.property.js', () => {
  it('should round-trip any wallet under any name', () => {
    forAll({
      seed: 1,
      runs: 300,
      generate: (random) => ({
        name: randomString(random, 1, 20),
        wallet: randomWallet(random)
      }),
      property: ({ name, wallet }) => {
        const uut = store()

        uut.write(name, wallet)

        assert.isTrue(uut.has(name))
        assert.deepEqual(uut.read(name), wallet)
      }
    })
  })

  it('should report any unwritten name as absent', () => {
    forAll({
      seed: 2,
      runs: 200,
      generate: (random) => randomString(random, 1, 20),
      property: (name) => {
        const uut = store()

        assert.isFalse(uut.has(name))
        assert.isNull(uut.read(name))
      }
    })
  })

  it('should read null when the stored file has no wallet key', () => {
    forAll({
      seed: 3,
      runs: 100,
      generate: (random) => randomString(random, 1, 20),
      property: (name) => {
        const uut = store()
        uut.fs.writeFileSync(uut.filePath(name), JSON.stringify({ other: true }))

        assert.isNull(uut.read(name))
      }
    })
  })

  it('should reject any name outside the safe grammar', () => {
    forAll({
      seed: 4,
      runs: 300,
      generate: (random) => randomString(random, 1, 12, '/\\..:$*?"<>| '),
      property: (name) => {
        const uut = store()

        assert.throws(() => uut.filePath(name), /Invalid wallet name/)
      }
    })
  })
})
