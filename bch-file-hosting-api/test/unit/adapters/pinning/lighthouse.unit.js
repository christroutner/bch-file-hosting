/*
  Unit tests for the Lighthouse pinning provider. The HTTP client is injected,
  so these tests never touch the network.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import LighthouseProvider from '../../../../src/adapters/pinning/lighthouse.js'

const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
const OTHER_CID = 'bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const GATEWAY = 'https://gateway.lighthouse.storage/ipfs/'
const API = 'https://api.lighthouse.storage'

function jsonResponse (body, status = 200) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('#lighthouse', () => {
  let sandbox
  let fetch
  let config

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetch = sandbox.stub()
    config = {
      lighthouseApiKey: 'test-key',
      lighthouseApiUrl: API,
      lighthouseGateway: GATEWAY
    }
  })

  afterEach(() => sandbox.restore())

  function build (overrides = {}) {
    return new LighthouseProvider({ config: { ...config, ...overrides }, fetch })
  }

  it('should require a config object', () => {
    assert.throws(() => new LighthouseProvider({ fetch }), /requires a config object/)
  })

  it('should describe itself', () => {
    const uut = build()

    assert.equal(uut.name, 'lighthouse')
    assert.deepEqual(uut.capabilities, { pinByCid: true, uploadBytes: false, unpin: true })
  })

  it('should default the API and gateway hosts when the config omits them', () => {
    const uut = new LighthouseProvider({ config: { lighthouseApiKey: 'k' } })

    assert.equal(uut.gatewayUrl(CID), `https://gateway.lighthouse.storage/ipfs/${CID}`)
    assert.equal(uut.fetch, globalThis.fetch)
  })

  it('should require an API key before pinning', async () => {
    const uut = build({ lighthouseApiKey: '' })

    try {
      await uut.pin({ cid: CID, filename: 'photo.jpg' })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, 'API key')
    }
  })

  it('should pin by CID, post the file name, and record the provider ref', async () => {
    fetch.resolves(jsonResponse({ data: { cid: CID, id: 'file-123' } }))
    const uut = build()

    const result = await uut.pin({ cid: CID, filename: 'photo.jpg' })

    assert.deepEqual(result, { providerCid: CID, providerRef: 'file-123' })

    const [url, options] = fetch.firstCall.args
    assert.equal(url, `${API}/api/lighthouse/pin`)
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.Authorization, 'Bearer test-key')
    assert.deepEqual(JSON.parse(options.body), { cid: CID, fileName: 'photo.jpg' })
  })

  it('should accept a top-level CID and a fileId ref in the pin response', async () => {
    fetch.resolves(jsonResponse({ cid: CID, fileId: 'file-456' }))

    const result = await build().pin({ cid: CID, filename: 'photo.jpg' })

    assert.deepEqual(result, { providerCid: CID, providerRef: 'file-456' })
  })

  it('should accept a string payload as the reported CID', async () => {
    fetch.resolves(jsonResponse({ data: CID }))

    const result = await build().pin({ cid: CID, filename: 'photo.jpg' })

    assert.deepEqual(result, { providerCid: CID, providerRef: null })
  })

  it('should accept a Hash field as the reported CID', async () => {
    fetch.resolves(jsonResponse({ data: { Hash: CID } }))

    const result = await build().pin({ cid: CID, filename: 'photo.jpg' })

    assert.deepEqual(result, { providerCid: CID, providerRef: null })
  })

  it('should treat a response without a reported CID as success with a ref', async () => {
    fetch.resolves(jsonResponse({ data: { id: 'file-9' } }))

    const result = await build().pin({ cid: CID, filename: 'photo.jpg' })

    assert.deepEqual(result, { providerCid: CID, providerRef: 'file-9' })
  })

  it('should treat an empty pin response as success with no ref', async () => {
    fetch.resolves(jsonResponse(undefined, 200))

    const result = await build().pin({ cid: CID, filename: 'photo.jpg' })

    assert.deepEqual(result, { providerCid: CID, providerRef: null })
  })

  it('should treat a non-JSON pin response as success', async () => {
    fetch.resolves(new Response('not json', { status: 200 }))

    const result = await build().pin({ cid: CID, filename: 'photo.jpg' })

    assert.deepEqual(result, { providerCid: CID, providerRef: null })
  })

  it('should fail when Lighthouse reports a different CID', async () => {
    fetch.resolves(jsonResponse({ data: { cid: OTHER_CID } }))

    try {
      await build().pin({ cid: CID, filename: 'photo.jpg' })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, OTHER_CID)
      assert.include(err.message, CID)
    }
  })

  it('should fail when the Lighthouse API errors with a body', async () => {
    fetch.resolves(jsonResponse({ error: 'boom' }, 500))

    try {
      await build().pin({ cid: CID, filename: 'photo.jpg' })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, '500')
      assert.include(err.message, 'boom')
    }
  })

  it('should fail when the Lighthouse API errors with no body', async () => {
    fetch.resolves(jsonResponse(undefined, 503))

    try {
      await build().pin({ cid: CID, filename: 'photo.jpg' })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, '503')
    }
  })

  it('should build the gateway URL and normalize a missing trailing slash', () => {
    assert.equal(build().gatewayUrl(CID), `${GATEWAY}${CID}`)
    assert.equal(
      build({ lighthouseGateway: 'https://gateway.example/ipfs' }).gatewayUrl(CID),
      `https://gateway.example/ipfs/${CID}`
    )
  })

  describe('#status', () => {
    function listWith (entry) {
      fetch.resolves(jsonResponse({ fileList: entry ? [entry] : [] }))
    }

    it('should report a pinned file as pinned', async () => {
      listWith({ cid: CID, id: 'file-1', status: 'pinned' })

      assert.equal(await build().status(CID), 'pinned')
    })

    it('should report a moving pin as pinning', async () => {
      listWith({ cid: CID, id: 'file-1', status: 'pinning' })

      assert.equal(await build().status(CID), 'pinning')
    })

    it('should report a failed file as failed', async () => {
      listWith({ cid: CID, id: 'file-1', status: 'failed' })

      assert.equal(await build().status(CID), 'failed')
    })

    it('should report unknown for an unrecognized status', async () => {
      listWith({ cid: CID, id: 'file-1', status: 'queued' })

      assert.equal(await build().status(CID), 'unknown')
    })

    it('should report unknown when the file is not listed', async () => {
      listWith(null)

      assert.equal(await build().status(CID), 'unknown')
    })

    it('should report unknown when the list response has no fileList', async () => {
      fetch.resolves(jsonResponse({ data: [] }))

      assert.equal(await build().status(CID), 'unknown')
    })

    it('should report unknown when the list response has an empty body', async () => {
      fetch.resolves(jsonResponse(undefined, 200))

      assert.equal(await build().status(CID), 'unknown')
    })
  })

  describe('#unpin', () => {
    it('should resolve the file id by CID and delete it', async () => {
      fetch.onFirstCall().resolves(jsonResponse({ fileList: [{ cid: CID, id: 'file-123', status: 'pinned' }] }))
      fetch.onSecondCall().resolves(jsonResponse({ message: 'ok' }))

      assert.isTrue(await build().unpin(CID))
      assert.equal(fetch.secondCall.args[0], `${API}/api/user/delete_file?id=file-123`)
      assert.equal(fetch.secondCall.args[1].method, 'DELETE')
    })

    it('should return false when the CID is not listed', async () => {
      fetch.resolves(jsonResponse({ fileList: [] }))

      assert.isFalse(await build().unpin(CID))
    })

    it('should return false when the listed entry has no id', async () => {
      fetch.resolves(jsonResponse({ fileList: [{ cid: CID }] }))

      assert.isFalse(await build().unpin(CID))
    })
  })
})
