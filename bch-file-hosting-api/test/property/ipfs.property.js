/*
  Property tests for the IPFS adapter's pin/provide boundary
  (src/adapters/ipfs/index.js).

  Invariant: the local pin is the only thing that decides pin success. For any
  content-routing provide behavior (resolve, reject, or never settle), `pin`
  still resolves true, the CID stays pinned, and the provide is initiated
  exactly once.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import IpfsAdapter from '../../src/adapters/ipfs/index.js'
import { makeCid } from '../unit/mocks/fake-helia.js'
import { forAllAsync, integerBetween } from './lib/harness.js'

const TEXT_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const PROVIDE_MODES = ['resolve', 'reject', 'hang']

function randomText (random) {
  let text = ''
  const length = integerBetween(random, 1, 30)
  for (let i = 0; i < length; i++) text += TEXT_CHARS[integerBetween(random, 0, TEXT_CHARS.length - 1)]
  return text
}

// A minimal fake Helia whose content-routing provide follows `mode`.
function makeNode (mode) {
  const pinned = new Set()
  const provides = []
  return {
    pinned,
    provides,
    pins: {
      add: async function * (cid) { pinned.add(cid.toString()); yield cid },
      isPinned: async (cid) => pinned.has(cid.toString())
    },
    routing: {
      provide: (cid) => {
        provides.push(cid.toString())
        if (mode === 'reject') return Promise.reject(new Error('routing unavailable'))
        if (mode === 'hang') return new Promise(() => {})
        return Promise.resolve()
      }
    }
  }
}

describe('#ipfs.property.js', () => {
  it('should resolve the pin and keep it pinned whatever the provide does', async () => {
    await forAllAsync({
      seed: 1,
      runs: 120,
      generate: (random) => ({
        text: randomText(random),
        mode: PROVIDE_MODES[integerBetween(random, 0, PROVIDE_MODES.length - 1)]
      }),
      property: async ({ text, mode }) => {
        const cid = (await makeCid(text)).toString()
        const node = makeNode(mode)
        const adapter = new IpfsAdapter({ config: {}, logger: { warn: () => {} } })
        adapter.helia = node

        assert.isTrue(await adapter.pin(cid))
        assert.isTrue(await adapter.isPinned(cid))
        assert.deepEqual(node.provides, [cid])
      }
    })
  })
})
