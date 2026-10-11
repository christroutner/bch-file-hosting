/*
  Property tests for the shared wallet command name validation
  (src/lib/wallet-command.js).

  Invariants: a name is accepted exactly when it matches the safe grammar
  [A-Za-z0-9_-]+, every accepted name resolves to a file inside the wallet
  store directory, and a rejected name is a usage error that touches neither
  the store nor the wallet service.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'
import path from 'node:path'

import WalletCommand, { validateWalletSource, resolveWalletSource } from '../../src/lib/wallet-command.js'
import { forAllAsync, integerBetween, randomString } from './lib/harness.js'

const config = { apiUrl: 'http://localhost:5050' }
const STORE_DIR = '/wallets'
const SAFE_NAME = /^[A-Za-z0-9_-]+$/
const SAFE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'
const UNSAFE_CHARS = ' /\\..:$*?"<>|\n\t\0é☃'

const MISSING_NAME_MESSAGE = 'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'
const BOTH_SOURCES_MESSAGE = 'Specify either a wallet name (-n) or a WIF (--wif), not both.'
function invalidNameMessage (name) {
  return `Invalid wallet name "${name}". Use only letters, digits, hyphens, and underscores.`
}

// The message thrown by fn, or null when fn does not throw.
function thrownMessage (fn) {
  try {
    fn()
    return null
  } catch (err) {
    return err.message
  }
}

// WalletCommand is abstract; supply the hooks its constructor binds.
class TestWalletCommand extends WalletCommand {
  constructor (deps) {
    super(deps)
    this.executed = []
  }

  async execute (flags) {
    this.executed.push(flags)
    return flags
  }

  report () {}
}

// Build a command whose store and service record every call and never touch disk.
function build () {
  const calls = { has: [], read: [], write: [], create: 0, balanceSats: [] }
  const walletStore = {
    filePath: (name) => path.join(STORE_DIR, `${name}.json`),
    has: (name) => { calls.has.push(name); return false },
    read: (name) => { calls.read.push(name); return null },
    write: (name) => { calls.write.push(name) }
  }
  const walletService = {
    create: async () => { calls.create++; return {} },
    balanceSats: async (wallet) => { calls.balanceSats.push(wallet); return 0 }
  }
  const output = []
  const errorOutput = []
  const command = new TestWalletCommand({
    config,
    walletStore,
    walletService,
    output: (msg) => output.push(msg),
    errorOutput: (msg) => errorOutput.push(msg)
  })
  return { command, calls, output, errorOutput }
}

// A rejected name must not reach the store or the wallet service.
function assertUntouched (command, calls) {
  assert.lengthOf(command.executed, 0)
  assert.lengthOf(calls.has, 0)
  assert.lengthOf(calls.read, 0)
  assert.lengthOf(calls.write, 0)
  assert.equal(calls.create, 0)
  assert.lengthOf(calls.balanceSats, 0)
}

describe('#wallet-command.property.js', () => {
  it('should accept exactly the safe grammar and keep accepted store paths contained', () => {
    forAllAsync({
      seed: 1,
      runs: 600,
      generate: (random) => randomString(random, 0, 24, random() < 0.5 ? SAFE_CHARS : UNSAFE_CHARS),
      property: async (name) => {
        const { command, calls, errorOutput } = build()

        const code = await command.run({ name })

        if (!name) {
          assert.equal(code, 2)
          assert.deepEqual(errorOutput, [MISSING_NAME_MESSAGE])
          assertUntouched(command, calls)
          return
        }

        if (SAFE_NAME.test(name)) {
          assert.equal(code, 0)
          assert.lengthOf(errorOutput, 0)
          assert.deepEqual(command.executed, [{ name }])
          // An accepted name must resolve to a file directly inside the store.
          assert.equal(path.dirname(command.walletStore.filePath(name)), STORE_DIR)
          return
        }

        assert.equal(code, 2)
        assert.deepEqual(errorOutput, [invalidNameMessage(name)])
        assertUntouched(command, calls)
      }
    })
  })

  it('should reject adversarial names that could escape the store directory', () => {
    const adversarial = [
      '../escape', '..', 'a/../../b', '/etc/passwd', 'dir/name', 'dir\\name',
      '.', 'a.b', 'has space', ' name', 'name ', 'na\nme', 'na\tme', 'na\u0000me',
      'é', '☃'
    ]

    forAllAsync({
      seed: 2,
      runs: adversarial.length,
      generate: (_random, run) => adversarial[run],
      property: async (name) => {
        const { command, calls, errorOutput } = build()

        const code = await command.run({ name })

        assert.equal(code, 2, `expected ${JSON.stringify(name)} to be rejected`)
        assert.deepEqual(errorOutput, [invalidNameMessage(name)])
        assertUntouched(command, calls)
      }
    })
  })

  it('should accept exactly one wallet source and reject missing or conflicting sources', () => {
    forAllAsync({
      seed: 3,
      runs: 600,
      generate: (random) => {
        const nameMode = integerBetween(random, 0, 3) // absent, empty, safe, unsafe
        const wifMode = integerBetween(random, 0, 2) // absent, empty, present

        let name
        if (nameMode === 1) {
          name = ''
        } else if (nameMode === 2) {
          name = randomString(random, 1, 24, SAFE_CHARS)
        } else if (nameMode === 3) {
          name = randomString(random, 1, 24, UNSAFE_CHARS)
        }

        let wif
        if (wifMode === 1) {
          wif = ''
        } else if (wifMode === 2) {
          wif = randomString(random, 40, 52, SAFE_CHARS)
        }

        return { name, wif }
      },
      property: async ({ name, wif }) => {
        const flags = {}
        if (name !== undefined) flags.name = name
        if (wif !== undefined) flags.wif = wif

        const hasName = Boolean(flags.name)
        const hasWif = Boolean(flags.wif)

        if (hasName && hasWif) {
          assert.equal(thrownMessage(() => validateWalletSource(flags)), BOTH_SOURCES_MESSAGE)
        } else if (hasWif) {
          assert.isTrue(validateWalletSource(flags))
        } else if (!hasName) {
          assert.equal(thrownMessage(() => validateWalletSource(flags)), MISSING_NAME_MESSAGE)
        } else if (SAFE_NAME.test(flags.name)) {
          assert.isTrue(validateWalletSource(flags))
        } else {
          assert.equal(thrownMessage(() => validateWalletSource(flags)), invalidNameMessage(flags.name))
        }
      }
    })
  })

  it('should resolve a WIF source directly and a name source from the store', () => {
    forAllAsync({
      seed: 4,
      runs: 400,
      generate: (random) => ({
        useWif: random() < 0.5,
        name: randomString(random, 1, 20, SAFE_CHARS),
        wif: randomString(random, 40, 52, SAFE_CHARS),
        wallet: {
          mnemonic: randomString(random, 1, 40, SAFE_CHARS),
          hdPath: `m/44'/245'/0'/0/${integerBetween(random, 0, 9)}`
        }
      }),
      property: async ({ useWif, name, wif, wallet }) => {
        const readNames = []
        const walletStore = {
          read: (readName) => {
            readNames.push(readName)
            return wallet
          }
        }

        if (useWif) {
          const resolved = resolveWalletSource(walletStore, { name, wif })
          assert.deepEqual(resolved, { wif })
          assert.lengthOf(readNames, 0)
          return
        }

        const resolved = resolveWalletSource(walletStore, { name })
        assert.equal(resolved, wallet)
        assert.deepEqual(readNames, [name])
      }
    })
  })

  it('should reject a wallet name that is absent from the store', () => {
    forAllAsync({
      seed: 5,
      runs: 200,
      generate: (random) => randomString(random, 1, 20, SAFE_CHARS),
      property: async (name) => {
        const walletStore = { read: () => null }

        assert.equal(
          thrownMessage(() => resolveWalletSource(walletStore, { name })),
          `Wallet "${name}" not found.`
        )
      }
    })
  })
})
