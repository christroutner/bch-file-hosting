/*
  Property tests for the wallet-create command (src/commands/wallet-create.js).

  Invariants: a new wallet is stored under the requested name and only its
  address is printed (never the mnemonic); an existing name fails without
  creating or writing; and a missing name is a usage error that touches nothing.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import WalletCreate from '../../src/commands/wallet-create.js'
import { forAllAsync, randomString, randomWallet } from './lib/harness.js'

const config = { apiUrl: 'http://localhost:5050' }
const USAGE_MESSAGE = 'You must specify a wallet name with the -n flag.'

// Build a command with an injected store and service that record every call.
function build ({ exists = false, createdWallet = {}, createError = null } = {}) {
  const calls = { has: [], create: 0, write: [] }
  const output = []
  const errorOutput = []
  const walletStore = {
    has: (name) => { calls.has.push(name); return exists },
    read: () => null,
    write: (name, wallet) => { calls.write.push({ name, wallet }); return true }
  }
  const walletService = {
    create: async () => {
      calls.create++
      if (createError) throw createError
      return createdWallet
    }
  }
  const command = new WalletCreate({
    config,
    walletStore,
    walletService,
    output: (msg) => output.push(msg),
    errorOutput: (msg) => errorOutput.push(msg)
  })
  return { command, calls, output, errorOutput }
}

describe('#wallet-create.property.js', () => {
  it('should store the created wallet under the name and print only its address', () => {
    forAllAsync({
      seed: 1,
      runs: 200,
      generate: (random) => ({ name: randomString(random, 1, 20), wallet: randomWallet(random) }),
      property: async ({ name, wallet }) => {
        const { command, calls, output } = build({ createdWallet: wallet })

        const code = await command.run({ name })

        assert.equal(code, 0)
        assert.include(output.join('\n'), wallet.cashAddress)
        assert.notInclude(output.join('\n'), wallet.mnemonic)
        assert.deepEqual(calls.write, [{ name, wallet }])
      }
    })
  })

  it('should reject an existing wallet name without creating or writing', () => {
    forAllAsync({
      seed: 2,
      runs: 200,
      generate: (random) => randomString(random, 1, 20),
      property: async (name) => {
        const { command, calls, errorOutput } = build({ exists: true })

        const code = await command.run({ name })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), `A wallet named ${name} already exists.`)
        assert.equal(calls.create, 0)
        assert.lengthOf(calls.write, 0)
      }
    })
  })

  it('should return 2 and touch nothing when the name flag is missing', async () => {
    const { command, calls, errorOutput } = build()

    const code = await command.run({})

    assert.equal(code, 2)
    assert.include(errorOutput.join('\n'), USAGE_MESSAGE)
    assert.equal(calls.create, 0)
    assert.lengthOf(calls.write, 0)
  })
})
