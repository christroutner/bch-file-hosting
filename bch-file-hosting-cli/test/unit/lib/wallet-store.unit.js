/*
  Unit tests for the local wallet store.
*/

// Global npm libraries
import fs from 'node:fs'
import path from 'node:path'
import { assert } from 'chai'

// Local libraries
import WalletStore, { isValidWalletName } from '../../../src/lib/wallet-store.js'

describe('#wallet-store', () => {
  let dir
  let uut

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(process.cwd(), 'tmp', 'unit', 'wallets-'))
    uut = new WalletStore({ dir })
  })

  describe('#write / #has / #read', () => {
    it('should store a wallet and read it back', () => {
      const wallet = { mnemonic: 'test mnemonic', cashAddress: 'bitcoincash:qtest' }

      uut.write('payer', wallet)

      assert.equal(uut.has('payer'), true)
      assert.deepEqual(uut.read('payer'), wallet)
      assert.include(fs.readFileSync(uut.filePath('payer'), 'utf8'), '"wallet"')
    })

    it('should return false and null for an unknown wallet', () => {
      assert.equal(uut.has('missing'), false)
      assert.equal(uut.read('missing'), null)
    })

    it('should return null when the stored file has no wallet key', () => {
      fs.writeFileSync(uut.filePath('corrupt'), JSON.stringify({ nope: true }))

      assert.equal(uut.read('corrupt'), null)
    })
  })

  describe('#filePath', () => {
    it('should keep an accepted name directly inside the store directory', () => {
      assert.equal(path.dirname(uut.filePath('a-b_c1')), dir)
    })

    it('should reject a name that could escape the store directory', () => {
      for (const name of ['../escape', 'dir/name', 'dir\\name', '..', 'has space', 'name.ext']) {
        assert.throws(() => uut.filePath(name), /Invalid wallet name/)
      }
    })

    it('should reject a non-string name', () => {
      assert.throws(() => uut.filePath(123), /Invalid wallet name/)
    })
  })

  describe('#isValidWalletName', () => {
    it('should accept names drawn from [A-Za-z0-9_-]+', () => {
      for (const name of ['payer', 'a-b', 'a_b', 'Wallet123']) {
        assert.isTrue(isValidWalletName(name))
      }
    })

    it('should reject anything else', () => {
      for (const name of ['', '../escape', 'has space', 'name.ext', 123, null, undefined]) {
        assert.isFalse(isValidWalletName(name))
      }
    })
  })
})
