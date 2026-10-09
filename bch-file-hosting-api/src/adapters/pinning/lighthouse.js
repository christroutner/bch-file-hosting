/*
  Pinning provider for Lighthouse (https://lighthouse.storage).

  Pins an existing CID through the Lighthouse REST API, so Lighthouse stores our
  exact CID instead of re-importing the bytes. The API key and HTTP client are
  injected, and the client is replaceable so tests never touch the network.

  Endpoints (from the lighthouse-go-sdk):
    POST   /api/lighthouse/pin                 { cid, fileName }
    GET    /api/user/files_uploaded
    DELETE /api/user/delete_file?id=<fileId>
*/

import PinningProvider from './pinning-provider.js'

const DEFAULT_API_URL = 'https://api.lighthouse.storage'
const DEFAULT_GATEWAY_URL = 'https://gateway.lighthouse.storage/ipfs/'

const STATUS_MAP = { pinned: 'pinned', pinning: 'pinning', failed: 'failed' }

function trimTrailingSlash (url) {
  return url.replace(/\/+$/, '')
}

function ensureTrailingSlash (url) {
  return url.endsWith('/') ? url : `${url}/`
}

// Decode the JSON body of a Response, or null for an empty or non-JSON body.
async function readJson (response, action) {
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Lighthouse ${action} request failed with HTTP ${response.status}${body ? `: ${body}` : ''}`)
  }
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (err) {
    return null
  }
}

// Lighthouse may echo the CID it accepted, under a few response shapes. Treat a
// missing report as success (the request itself already succeeded).
function reportedCid (data) {
  if (!data) return null
  const payload = data.data ?? data
  if (typeof payload === 'string') return payload
  return payload.cid ?? payload.Hash ?? null
}

function reportedRef (data) {
  if (!data) return null
  const payload = data.data ?? data
  if (typeof payload !== 'object' || payload === null) return null
  return payload.id ?? payload.fileId ?? null
}

function mapStatus (status) {
  return STATUS_MAP[status] || 'unknown'
}

class LighthouseProvider extends PinningProvider {
  constructor ({ config, fetch } = {}) {
    super()
    if (!config) throw new Error('LighthouseProvider requires a config object')
    this.config = config
    this.apiKey = config.lighthouseApiKey || ''
    this.apiUrl = trimTrailingSlash(config.lighthouseApiUrl || DEFAULT_API_URL)
    this.gatewayBase = ensureTrailingSlash(config.lighthouseGateway || DEFAULT_GATEWAY_URL)
    this.fetch = fetch || globalThis.fetch
  }

  get name () {
    return 'lighthouse'
  }

  get capabilities () {
    return { pinByCid: true, uploadBytes: false, unpin: true }
  }

  headers () {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    }
  }

  async pin ({ cid, filename } = {}) {
    if (!this.apiKey) throw new Error('Lighthouse API key is not configured')

    const response = await this.fetch(`${this.apiUrl}/api/lighthouse/pin`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ cid, fileName: filename })
    })
    const data = await readJson(response, 'pin')

    const reported = reportedCid(data)
    if (reported !== null && reported !== cid) {
      throw new Error(`Lighthouse reported CID ${reported}, expected ${cid}`)
    }
    return { providerCid: cid, providerRef: reportedRef(data) }
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

  gatewayUrl (cid) {
    return `${this.gatewayBase}${cid}`
  }

  async findUpload (cid) {
    const response = await this.fetch(`${this.apiUrl}/api/user/files_uploaded`, {
      method: 'GET',
      headers: this.headers()
    })
    const data = await readJson(response, 'list')
    const uploads = (data && data.fileList) || []
    return uploads.find(entry => entry.cid === cid) || null
  }
}

export default LighthouseProvider
