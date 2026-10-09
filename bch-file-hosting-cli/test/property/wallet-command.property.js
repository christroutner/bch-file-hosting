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

import WalletCommand from '../../src/lib/wallet-command.js'
import { forAllAsync, randomString } from './lib/harness.js'

const config = { apiUrl: 'http://localhost:5050' }
const STORE_DIR = '/wallets'
const SAFE_NAME = /^[A-Za-z0-9_-]+$/
const SAFE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'
const UNSAFE_CHARS = ' /\\..:$*?"<>|\n\t\0é☃'

const MISSING_NAME_MESSAGE = 'You must specify a wallet name with the -n flag.'
function invalidNameMessage (name) {
  return `Invalid wallet name "${name}". Use only letters, digits, hyphens, and underscores.`
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
})
