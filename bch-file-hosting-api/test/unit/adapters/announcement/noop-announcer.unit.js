/*
  Unit tests for the placeholder announcer.
*/

import { assert } from 'chai'

import NoopAnnouncer from '../../../../src/adapters/announcement/noop-announcer.js'

describe('#noop-announcer.js', () => {
  it('should announce nothing', async () => {
    const uut = new NoopAnnouncer()

    const result = await uut.announce({ cid: 'abc', filename: 'a.txt', sizeBytes: 1, paymentAddress: 'addr' })

    assert.deepEqual(result, { announced: false, txid: null })
  })

  it('should work with no arguments', async () => {
    const uut = new NoopAnnouncer()

    assert.deepEqual(await uut.announce(), { announced: false, txid: null })
  })
})
