/*
  Unit tests for the shared wallet command base.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import WalletCommand, { UsageError } from '../../../src/lib/wallet-command.js'

const USAGE_MESSAGE = 'You must specify a wallet name with the -n flag.'

function invalidNameMessage (name) {
  return `Invalid wallet name "${name}". Use only letters, digits, hyphens, and underscores.`
}

// WalletCommand is abstract; provide the two hooks its constructor binds so the
// shared validateFlags logic can be exercised directly.
class TestWalletCommand extends WalletCommand {
  async execute () {}

  report () {}
}

describe('#wallet-command', () => {
  let sandbox
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    uut = new TestWalletCommand({
      walletStore: { has: sandbox.stub(), read: sandbox.stub(), write: sandbox.stub() },
      walletService: { create: sandbox.stub(), balanceSats: sandbox.stub() }
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#validateFlags', () => {
    it('should accept names built from letters, digits, hyphens, and underscores', () => {
      for (const name of ['payer', 'savings', 'a-b', 'a_b', 'Wallet123', 'A1-b2_c3']) {
        assert.equal(uut.validateFlags({ name }), true)
      }
    })

    it('should throw the missing-name usage error when no name is given', () => {
      try {
        uut.validateFlags({})
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, USAGE_MESSAGE)
      }
    })

    it('should throw the missing-name usage error when the name is an empty string', () => {
      try {
        uut.validateFlags({ name: '' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, USAGE_MESSAGE)
      }
    })

    it('should throw the invalid-name usage error for path separators and parent references', () => {
      for (const name of ['../escape', 'dir/name', 'dir\\name', '..']) {
        try {
          uut.validateFlags({ name })
          assert.fail(`Unexpected result for ${name}`)
        } catch (err) {
          assert.instanceOf(err, UsageError)
          assert.equal(err.message, invalidNameMessage(name))
        }
      }
    })

    it('should throw the invalid-name usage error for whitespace and dots', () => {
      for (const name of ['has space', 'name.ext', 'a.b.c', ' trailing', 'leading ']) {
        try {
          uut.validateFlags({ name })
          assert.fail(`Unexpected result for ${name}`)
        } catch (err) {
          assert.instanceOf(err, UsageError)
          assert.equal(err.message, invalidNameMessage(name))
        }
      }
    })
  })
})
