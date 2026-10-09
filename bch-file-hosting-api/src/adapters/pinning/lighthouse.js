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

// IPFS's /api/v0/add returns newline-delimited JSON, one line per added item.
// With wrap-with-directory the wrapping directory is the entry with no name.
function parseAddedCid (text) {
  let fallback = null
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    const cid = entry.Hash ?? entry.cid ?? null
    if (!cid) continue
    if (entry.Name === '' || entry.path === '') return cid
    fallback = cid
  }
  return fallback
}

// Normalize the content source (a Blob, a web ReadableStream, or an async
// iterable of chunks) into a Blob for the multipart upload.
async function toBlob (content) {
  if (typeof Blob !== 'undefined' && content instanceof Blob) return content
  if (content && typeof content.getReader === 'function') return new Response(content).blob()

  const chunks = []
  for await (const chunk of content) {
    chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk)
  }
  return new Blob(chunks)
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
