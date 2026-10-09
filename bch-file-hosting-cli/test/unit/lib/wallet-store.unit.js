/*
  Unit tests for the local wallet store.
*/

// Global npm libraries
import fs from 'node:fs'
import path from 'node:path'
import { assert } from 'chai'

// Local libraries
import WalletStore from '../../../src/lib/wallet-store.js'

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
})
