/*
  A small in-memory stand-in for a Helia node, for IPFS adapter unit tests.
  It stores real CIDs and supports a fake DAG codec so block walking can be
  tested without a running node.
*/

import sinon from 'sinon'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'

export const DAG_PB_CODE = 0x70

export async function makeCid (text, code = raw.code) {
  const digest = await sha256.digest(new TextEncoder().encode(text))
  return CID.create(1, code, digest)
}

// Build a fake Helia whose blockstore holds the given DAG.
// dag: { [cidString]: { cid, links: [CID] } }
export function makeFakeHelia (sandbox = sinon) {
  const blocks = new Map()
  const linkMap = new Map()
  const pinnedBlocks = new Set()

  const fakeDagCodec = {
    code: DAG_PB_CODE,
    decode: (bytes) => ({ Links: linkMap.get(new TextDecoder().decode(bytes)).map(Hash => ({ Hash })) })
  }

  const helia = {
    blocks,
    pinnedBlocks,

    addBlock (cid, links = []) {
      const key = cid.toString()
      blocks.set(key, new TextEncoder().encode(key))
      linkMap.set(key, links)
    },

    blockstore: {
      has: sandbox.stub().callsFake(async (cid) => blocks.has(cid.toString())),
      get: sandbox.stub().callsFake(async (cid) => blocks.get(cid.toString())),
      delete: sandbox.stub().callsFake(async (cid) => { blocks.delete(cid.toString()) })
    },

    getCodec: sandbox.stub().callsFake(async (code) => (code === DAG_PB_CODE ? fakeDagCodec : raw)),

    pins: {
      add: sandbox.stub().callsFake(async function * (cid) { pinnedBlocks.add(cid.toString()); yield cid }),
      rm: sandbox.stub().callsFake(async function * (cid) { pinnedBlocks.delete(cid.toString()); yield cid }),
      isPinned: sandbox.stub().callsFake(async (cid) => pinnedBlocks.has(cid.toString()))
    },

    fs: {
      addAll: sandbox.stub(),
      cat: sandbox.stub().returns((async function * () { yield new Uint8Array([1, 2, 3]) })()),
      stat: sandbox.stub().resolves({ type: 'directory' })
    },

    stop: sandbox.stub().resolves()
  }

  return helia
}
