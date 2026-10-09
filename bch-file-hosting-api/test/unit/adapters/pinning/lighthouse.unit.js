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
const UPLOAD = 'https://upload.lighthouse.storage'
const SIZE = 1024

function jsonResponse (body, status = 200) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

// IPFS's /api/v0/add response: one JSON object per line, the wrapping directory
// (empty Name) last.
function addResponse (cid, name = '') {
  return new Response(
    `{"Name":"photo.jpg","Hash":"bafyfile","Size":"1024"}\n{"Name":"${name}","Hash":"${cid}","Size":"1096"}\n`,
    { status: 200 }
  )
}

function headResponse (status = 200, length = SIZE) {
  const headers = length === undefined ? {} : { 'content-length': String(length) }
  return new Response(null, { status, headers })
}

function content () {
  return new Blob([new Uint8Array(SIZE)])
}

describe('#lighthouse', () => {
  let sandbox
  let fetch
  let sleep
  let config

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetch = sandbox.stub()
    sleep = sandbox.stub().resolves()
    config = {
      lighthouseApiKey: 'test-key',
      lighthouseApiUrl: API,
      lighthouseUploadUrl: UPLOAD,
      lighthouseGateway: GATEWAY,
      lighthouseVerifyAttempts: 3,
      lighthouseVerifyDelayMs: 0
    }
  })

  afterEach(() => sandbox.restore())

  function build (overrides = {}) {
    return new LighthouseProvider({ config: { ...config, ...overrides }, fetch, sleep })
  }

  it('should require a config object', () => {
    assert.throws(() => new LighthouseProvider({ fetch }), /requires a config object/)
  })

  it('should describe itself as an authoritative upload provider', () => {
    const uut = build()

    assert.equal(uut.name, 'lighthouse')
    assert.deepEqual(uut.capabilities, { pinByCid: false, uploadBytes: true, unpin: true, authoritative: true })
  })

  it('should default the API, upload, and gateway hosts when the config omits them', () => {
    const uut = new LighthouseProvider({ config: { lighthouseApiKey: 'k' } })

    assert.equal(uut.gatewayUrl(CID), `https://gateway.lighthouse.storage/ipfs/${CID}`)
    assert.equal(uut.uploadUrl, 'https://upload.lighthouse.storage')
    assert.equal(uut.verifyAttempts, 3)
    assert.equal(uut.fetch, globalThis.fetch)
  })

  it('should require an API key before pinning', async () => {
    const uut = build({ lighthouseApiKey: '' })

    try {
      await uut.pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE, content: content() })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, 'API key')
    }
  })

  it('should require the file content before pinning', async () => {
    try {
      await build().pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, 'file content')
    }
  })

  it('should upload the bytes, verify the gateway, and report the CID', async () => {
    fetch.onFirstCall().resolves(addResponse(CID))
    fetch.onSecondCall().resolves(headResponse(200, SIZE))
    const uut = build()

    const result = await uut.pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE, content: content() })

    assert.deepEqual(result, { providerCid: CID, providerRef: null })

    const [uploadUrl, uploadOptions] = fetch.firstCall.args
    assert.equal(uploadUrl, `${UPLOAD}/api/v0/add?wrap-with-directory=true&cid-version=1&raw-leaves=true&pin=true`)
    assert.equal(uploadOptions.method, 'POST')
    assert.equal(uploadOptions.headers.Authorization, 'Bearer test-key')
    assert.isUndefined(uploadOptions.headers['Content-Type'])
    assert.equal(uploadOptions.body.get('file').name, 'photo.jpg')

    const [headUrl, headOptions] = fetch.secondCall.args
    assert.equal(headUrl, `${GATEWAY}${CID}/photo.jpg`)
    assert.equal(headOptions.method, 'HEAD')
  })

  it('should accept a top-level cid field in the add response', async () => {
    fetch.onFirstCall().resolves(new Response(`{"Name":"","cid":"${CID}"}\n`, { status: 200 }))
    fetch.onSecondCall().resolves(headResponse(200, SIZE))

    const result = await build().pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE, content: content() })

    assert.deepEqual(result, { providerCid: CID, providerRef: null })
  })

  it('should fall back to the file entry when the add response has no wrapping directory', async () => {
    fetch.onFirstCall().resolves(new Response(`{"Name":"photo.jpg","Hash":"${CID}"}\n`, { status: 200 }))
    fetch.onSecondCall().resolves(headResponse(200, SIZE))

    const result = await build().pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE, content: content() })

    assert.deepEqual(result, { providerCid: CID, providerRef: null })
  })

  it('should treat a missing reported CID as success after gateway verification', async () => {
    fetch.onFirstCall().resolves(new Response('', { status: 200 }))
    fetch.onSecondCall().resolves(headResponse(200, SIZE))

    const result = await build().pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE, content: content() })

    assert.deepEqual(result, { providerCid: CID, providerRef: null })
  })

  it('should fail when Lighthouse reports a different CID without checking the gateway', async () => {
    fetch.onFirstCall().resolves(addResponse(OTHER_CID))

    try {
      await build().pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE, content: content() })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, OTHER_CID)
      assert.include(err.message, CID)
      assert.isTrue(fetch.calledOnce)
    }
  })

  it('should fail when the upload errors with a body', async () => {
    fetch.resolves(jsonResponse({ error: 'boom' }, 500))

    try {
      await build().pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE, content: content() })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, '500')
      assert.include(err.message, 'boom')
    }
  })

  it('should fail when the upload errors with no body', async () => {
    fetch.resolves(new Response('', { status: 503 }))

    try {
      await build().pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE, content: content() })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, '503')
    }
  })

  it('should fail when the gateway never serves the uploaded file', async () => {
    fetch.onFirstCall().resolves(addResponse(CID))
    fetch.onSecondCall().resolves(headResponse(404))
    fetch.onThirdCall().resolves(headResponse(404))
    fetch.onCall(3).resolves(headResponse(404))

    try {
      await build().pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE, content: content() })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, CID)
      assert.include(err.message, '404')
    }
    // One upload plus one HEAD per verification attempt.
    assert.equal(fetch.callCount, 1 + 3)
    assert.equal(sleep.callCount, 2)
  })

  it('should retry the gateway check until the file is retrievable', async () => {
    fetch.onFirstCall().resolves(addResponse(CID))
    fetch.onSecondCall().resolves(headResponse(404))
    fetch.onThirdCall().resolves(headResponse(200, SIZE))

    const result = await build().pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE, content: content() })

    assert.deepEqual(result, { providerCid: CID, providerRef: null })
    assert.equal(sleep.callCount, 1)
  })

  it('should fail when the gateway reports the wrong content length', async () => {
    fetch.onFirstCall().resolves(addResponse(CID))
    fetch.resolves(headResponse(200, SIZE + 1))

    try {
      await build().pin({ cid: CID, filename: 'photo.jpg', sizeBytes: SIZE, content: content() })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, 'content-length')
    }
  })

  it('should build the gateway URL and normalize a missing trailing slash', () => {
    assert.equal(build().gatewayUrl(CID), `${GATEWAY}${CID}`)
    assert.equal(
      build({ lighthouseGateway: 'https://gateway.example/ipfs' }).gatewayUrl(CID),
      `https://gateway.example/ipfs/${CID}`
    )
  })

  it('should append the URL-encoded file name for a wrapping-directory CID', () => {
    assert.equal(build().gatewayUrl(CID, 'photo.jpg'), `${GATEWAY}${CID}/photo.jpg`)
    assert.equal(build().gatewayUrl(CID, 'my photo.jpg'), `${GATEWAY}${CID}/my%20photo.jpg`)
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
