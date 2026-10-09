/*
  Pinning provider for Lighthouse (https://lighthouse.storage).

  Uploads the file bytes to Lighthouse's IPFS-compatible endpoint (which
  reproduces our exact wrapping-directory CID), verifies the copy is retrievable
  through the Lighthouse gateway, and only then reports success. Pin-by-CID does
  not work for us: Lighthouse fetches the CID from the IPFS network, and our
  node's provide may not have propagated. The API key and HTTP client are
  injected, and the client is replaceable so tests never touch the network.

  Endpoints:
    POST   /api/v0/add?wrap-with-directory=true&...   multipart file upload
    GET    /api/user/files_uploaded                    list uploads
    DELETE /api/user/delete_file?id=<fileId>           unpin
  The gateway is checked with HEAD <gateway>/<cid>/<filename>.
*/

import PinningProvider from './pinning-provider.js'

const DEFAULT_API_URL = 'https://api.lighthouse.storage'
const DEFAULT_UPLOAD_URL = 'https://upload.lighthouse.storage'
const DEFAULT_GATEWAY_URL = 'https://gateway.lighthouse.storage/ipfs/'
const DEFAULT_VERIFY_ATTEMPTS = 3
const DEFAULT_VERIFY_DELAY_MS = 2000

// Reproduce the exact CIDv1 / raw-leaves wrapping-directory import the IPFS
// adapter uses, so Lighthouse reports the CID we issued.
const ADD_QUERY = 'wrap-with-directory=true&cid-version=1&raw-leaves=true&pin=true'

const STATUS_MAP = { pinned: 'pinned', pinning: 'pinning', failed: 'failed' }

function trimTrailingSlash (url) {
  return url.replace(/\/+$/, '')
}

function ensureTrailingSlash (url) {
  return url.endsWith('/') ? url : `${url}/`
}

// Read a response body and throw a descriptive error for a non-2xx response.
async function readText (response, action) {
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Lighthouse ${action} request failed with HTTP ${response.status}${text ? `: ${text}` : ''}`)
  }
  return text
}

// Decode the JSON body of a Response, or null for an empty or non-JSON body.
async function readJson (response, action) {
  const text = await readText(response, action)
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Parse one line of the newline-delimited /api/v0/add response. `undefined`
// marks a blank or malformed line to skip.
function parseAddLine (line) {
  if (!line.trim()) return undefined
  try {
    return JSON.parse(line)
  } catch {
    return undefined
  }
}

// The CID of one add-response entry, under either field name.
function entryCid (entry) {
  return entry.Hash ?? entry.cid ?? null
}

// The wrapping directory is the add-response entry with no name.
function isWrappingDirectory (entry) {
  return entry.Name === '' || entry.path === ''
}

// IPFS's /api/v0/add returns newline-delimited JSON, one line per added item.
// With wrap-with-directory the wrapping directory is the entry with no name.
function parseAddedCid (text) {
  let fallback = null
  for (const line of text.split('\n')) {
    const entry = parseAddLine(line)
    if (entry === undefined) continue
    const cid = entryCid(entry)
    if (!cid) continue
    if (isWrappingDirectory(entry)) return cid
    fallback = cid
  }
  return fallback
}

function isBlob (value) {
  return typeof Blob !== 'undefined' && value instanceof Blob
}

function isReadableStream (value) {
  return Boolean(value) && typeof value.getReader === 'function'
}

// Text chunks are encoded; byte chunks pass through unchanged.
function chunkToBytes (chunk) {
  return typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk
}

async function collectChunks (content) {
  const chunks = []
  for await (const chunk of content) chunks.push(chunkToBytes(chunk))
  return chunks
}

// Normalize the content source (a Blob, a web ReadableStream, or an async
// iterable of chunks) into a Blob for the multipart upload.
async function toBlob (content) {
  if (isBlob(content)) return content
  if (isReadableStream(content)) return new Response(content).blob()
  return new Blob(await collectChunks(content))
}

function mapStatus (status) {
  return STATUS_MAP[status] || 'unknown'
}

class LighthouseProvider extends PinningProvider {
  constructor ({ config, fetch, sleep } = {}) {
    super()
    if (!config) throw new Error('LighthouseProvider requires a config object')
    this.config = config
    this.apiKey = config.lighthouseApiKey || ''
    this.apiUrl = trimTrailingSlash(config.lighthouseApiUrl || DEFAULT_API_URL)
    this.uploadUrl = trimTrailingSlash(config.lighthouseUploadUrl || DEFAULT_UPLOAD_URL)
    this.gatewayBase = ensureTrailingSlash(config.lighthouseGateway || DEFAULT_GATEWAY_URL)
    this.verifyAttempts = config.lighthouseVerifyAttempts ?? DEFAULT_VERIFY_ATTEMPTS
    this.verifyDelayMs = config.lighthouseVerifyDelayMs ?? DEFAULT_VERIFY_DELAY_MS
    this.fetch = fetch || globalThis.fetch
    this.sleep = sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)))
  }

  get name () {
    return 'lighthouse'
  }

  get capabilities () {
    return { pinByCid: false, uploadBytes: true, unpin: true, authoritative: true }
  }

  authHeaders () {
    return { Authorization: `Bearer ${this.apiKey}` }
  }

  headers () {
    return { ...this.authHeaders(), 'Content-Type': 'application/json' }
  }

  async pin ({ cid, filename, sizeBytes, content } = {}) {
    if (!this.apiKey) throw new Error('Lighthouse API key is not configured')
    if (!content) throw new Error('Lighthouse pin requires the file content')

    const reported = await this.upload({ filename, content })
    if (reported !== null && reported !== cid) {
      throw new Error(`Lighthouse reported CID ${reported}, expected ${cid}`)
    }

    await this.verify({ cid, filename, sizeBytes })
    return { providerCid: cid, providerRef: null }
  }

  // Upload the bytes and return the CID Lighthouse reports, or null if it
  // reported none.
  async upload ({ filename, content }) {
    const form = new FormData()
    form.append('file', await toBlob(content), filename)

    const response = await this.fetch(`${this.uploadUrl}/api/v0/add?${ADD_QUERY}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: form
    })
    return parseAddedCid(await readText(response, 'upload'))
  }

  // Confirm the gateway serves the file we just uploaded, retrying briefly
  // while the CDN propagates the new CID.
  async verify ({ cid, filename, sizeBytes }) {
    const url = this.gatewayUrl(cid, filename)
    let reason = 'no response'

    for (let attempt = 1; attempt <= this.verifyAttempts; attempt++) {
      reason = await this.verifyOnce({ url, sizeBytes })
      if (reason === null) return true
      if (attempt < this.verifyAttempts) await this.sleep(this.verifyDelayMs)
    }

    throw new Error(`Lighthouse gateway could not retrieve ${cid}: ${reason}`)
  }

  // Returns null when the file is retrievable, or a reason string when it is not.
  async verifyOnce ({ url, sizeBytes }) {
    try {
      const response = await this.fetch(url, { method: 'HEAD' })
      if (!response.ok) return `HTTP ${response.status}`
      const length = Number(response.headers.get('content-length'))
      if (length !== sizeBytes) {
        return `content-length ${response.headers.get('content-length')}, expected ${sizeBytes}`
      }
      return null
    } catch (err) {
      return err.message
    }
  }

  async status (cid) {
    const entry = await this.findUpload(cid)
    if (!entry) return 'unknown'
    return mapStatus(entry.status)
  }

  async unpin (cid) {
    const entry = await this.findUpload(cid)
    if (!entry || !entry.id) return false

    const response = await this.fetch(`${this.apiUrl}/api/user/delete_file?id=${encodeURIComponent(entry.id)}`, {
      method: 'DELETE',
      headers: this.headers()
    })
    await readJson(response, 'unpin')
    return true
  }

  gatewayUrl (cid, filename) {
    if (!filename) return `${this.gatewayBase}${cid}`
    return `${this.gatewayBase}${cid}/${encodeURIComponent(filename)}`
  }

  async findUpload (cid) {
    const response = await this.fetch(`${this.apiUrl}/api/user/files_uploaded`, {
      method: 'GET',
      headers: this.headers()
    })
    const data = await readJson(response, 'list')
    const uploads = data?.fileList ?? []
    return uploads.find(entry => entry.cid === cid) || null
  }
}

export default LighthouseProvider

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T19:05:33.602Z","module_hash":"ffa86e77504f0caae4f94960f56f051c90b46c7c496b2bc580ec6d9d91abf037","functions":[{"id":"func/trimTrailingSlash","name":"trimTrailingSlash","line":32,"end_line":34,"hash":"19c0e21ecb4e1b92a42dfafe6af982ef45ed6a85114bead015ccddb1a5763077"},{"id":"func/ensureTrailingSlash","name":"ensureTrailingSlash","line":36,"end_line":38,"hash":"ef6b753d88bcc488e5b1b494f79df881d6b51f1c12cd5bd0266bbe223751fe73"},{"id":"func/readText","name":"readText","line":41,"end_line":47,"hash":"19837fce0b53acedd7b3ba8153d6f9d7fefcc9062ee9086fad8880cb6f0c0877"},{"id":"func/readJson","name":"readJson","line":50,"end_line":58,"hash":"78a9fe0f9ab328f2e31754d05695d56510148f7ad88596b9c625e2ae9c7fc69b"},{"id":"func/parseAddLine","name":"parseAddLine","line":62,"end_line":69,"hash":"0121e89de78998b7847e8d5f5d12febb3ab585a35e06c216dd27be3b7437c357"},{"id":"func/entryCid","name":"entryCid","line":72,"end_line":74,"hash":"b62b53d07a260d45ed12b1897dff62a86830f0d02ad39cb0c68ba5b94955e63c"},{"id":"func/isWrappingDirectory","name":"isWrappingDirectory","line":77,"end_line":79,"hash":"d3c2994c4bb7be0fa7dc3eadf1121996c029c7b0fbf1d4564a557c5461045993"},{"id":"func/parseAddedCid","name":"parseAddedCid","line":83,"end_line":94,"hash":"9ffc1fd306dbe287e3b0cdceb856bc7e3b409c9bacee70dbc4591dd4f2f767e5"},{"id":"func/isBlob","name":"isBlob","line":96,"end_line":98,"hash":"a113758e3d8203c884b026ba497a5127799094a7a22efc97461d22bfe128c86f"},{"id":"func/isReadableStream","name":"isReadableStream","line":100,"end_line":102,"hash":"629f30fdcdf45db58f27d303c88b2aff9e516ee1f570aa66404d556813e177cc"},{"id":"func/chunkToBytes","name":"chunkToBytes","line":105,"end_line":107,"hash":"b8105b046208f99830675010b7a8b03987143bf890f96a4e03af85fb5d62aafa"},{"id":"func/collectChunks","name":"collectChunks","line":109,"end_line":113,"hash":"762ef198e4eec7748befa92d469ef66cc19bae95e0030016119b108af247f173"},{"id":"func/toBlob","name":"toBlob","line":117,"end_line":121,"hash":"ac1c306cdc15c371fbbbda23c7185772ec5373de967e0c088721bdb94f684a5e"},{"id":"func/mapStatus","name":"mapStatus","line":123,"end_line":125,"hash":"e7b9bfda3b62cfa848c546b80f759819b725d0a014fca971047e3a77c4dc6864"},{"id":"func/LighthouseProvider.constructor","name":"LighthouseProvider.constructor","line":128,"end_line":140,"hash":"bafe7dc496264c4ee5465429807022eb4f1dfd6f07986e00a85307f12983c222"},{"id":"func/LighthouseProvider.name","name":"LighthouseProvider.name","line":142,"end_line":144,"hash":"b6b9f0ea8a007b0bc47de0fa480327eececbc236db920274adfebb84515770e0"},{"id":"func/LighthouseProvider.capabilities","name":"LighthouseProvider.capabilities","line":146,"end_line":148,"hash":"db7e2fb79f63751ac61b68dd1b3d3105d5589f6d2f535a16aabe44d3b335f96d"},{"id":"func/LighthouseProvider.authHeaders","name":"LighthouseProvider.authHeaders","line":150,"end_line":152,"hash":"c229b2a18bfd1ed2508b296874d7ce2bc26cf0153edc680eb890690694c1fa9d"},{"id":"func/LighthouseProvider.headers","name":"LighthouseProvider.headers","line":154,"end_line":156,"hash":"8fe4623f7719b23d630b0c79c39faf0bc5efeb1af460ecef5efd2d6a7514940e"},{"id":"func/LighthouseProvider.pin","name":"LighthouseProvider.pin","line":158,"end_line":169,"hash":"d17e7bf11ae909098eebc4af478fecac68666acfacc0642b1c7094bc96c51f9a"},{"id":"func/LighthouseProvider.upload","name":"LighthouseProvider.upload","line":173,"end_line":183,"hash":"e057802114749829ad7881cbe7a2456d3c5cba2916ebdb48bc3673ce3445b894"},{"id":"func/LighthouseProvider.verify","name":"LighthouseProvider.verify","line":187,"end_line":198,"hash":"200419acda7167991bded2660497f410fb1b705f685c6e5adebea03314ce596d"},{"id":"func/LighthouseProvider.verifyOnce","name":"LighthouseProvider.verifyOnce","line":201,"end_line":213,"hash":"9d4b13dbbfcad4da252048acfc85aaf9869558afcbcd95ff595b8186cbaa4432"},{"id":"func/LighthouseProvider.status","name":"LighthouseProvider.status","line":215,"end_line":219,"hash":"298440b3aefe5d4de9aff533c8d259beccfddf4f1c7ef4f62b6bd3ca79dbe7c5"},{"id":"func/LighthouseProvider.unpin","name":"LighthouseProvider.unpin","line":221,"end_line":231,"hash":"d7c1032faf4894819cfceea795153a3a8e2bc5e2e473216da9b36d14e46440b9"},{"id":"func/LighthouseProvider.gatewayUrl","name":"LighthouseProvider.gatewayUrl","line":233,"end_line":236,"hash":"a4a0500b88dba68b70eab6cf498f34cc939ed06f7fc3b728da9082650f7130f8"},{"id":"func/LighthouseProvider.findUpload","name":"LighthouseProvider.findUpload","line":238,"end_line":246,"hash":"3b30ae0f1e72fc68f5bb0e16450918ff04cb7691f99674789b45782bd5d49781"}]}
// mutate4javascript-manifest-end
