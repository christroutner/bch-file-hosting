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
  } catch {
    return null
  }
}

// The payload is either wrapped in a `data` property or is the body itself.
function payloadOf (data) {
  if (!data) return null
  return data.data ?? data
}

// Lighthouse may echo the CID it accepted, under a few response shapes. Treat a
// missing report as success (the request itself already succeeded).
function reportedCid (data) {
  const payload = payloadOf(data)
  if (typeof payload === 'string') return payload
  if (payload === null) return null
  return payload.cid ?? payload.Hash ?? null
}

function reportedRef (data) {
  const payload = payloadOf(data)
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
// {"version":1,"tested_at":"2026-10-09T02:56:44.616Z","module_hash":"58a09b50ddbf371760878c327ae2fed5c857ee021e9f64c1bd82948191453636","functions":[{"id":"func/trimTrailingSlash","name":"trimTrailingSlash","line":21,"end_line":23,"hash":"19c0e21ecb4e1b92a42dfafe6af982ef45ed6a85114bead015ccddb1a5763077"},{"id":"func/ensureTrailingSlash","name":"ensureTrailingSlash","line":25,"end_line":27,"hash":"ef6b753d88bcc488e5b1b494f79df881d6b51f1c12cd5bd0266bbe223751fe73"},{"id":"func/readJson","name":"readJson","line":30,"end_line":42,"hash":"e6d97910fadcbeb2b948dbeaa3a8b8d6ab98b0b4e989afc1e21b51ea36e52d92"},{"id":"func/payloadOf","name":"payloadOf","line":45,"end_line":48,"hash":"b32a1696dcbf09fd0c0e4e1f50db4ca2f28a6e224c0bab870f65f8d65832bd01"},{"id":"func/reportedCid","name":"reportedCid","line":52,"end_line":57,"hash":"cca121dc3f2b894f60437a53e74939a322346526c68803ca86e973abc77ce7d2"},{"id":"func/reportedRef","name":"reportedRef","line":59,"end_line":63,"hash":"e09b0b3fb0fbe094b2daf206312fed68668d5204897b3ad26d5c665e3029434c"},{"id":"func/mapStatus","name":"mapStatus","line":65,"end_line":67,"hash":"e7b9bfda3b62cfa848c546b80f759819b725d0a014fca971047e3a77c4dc6864"},{"id":"func/LighthouseProvider.constructor","name":"LighthouseProvider.constructor","line":70,"end_line":78,"hash":"ea1d03abd6827ce9060b7d5f3cbe9548cff3698fc0f7cadd2ca73b5c0ed87059"},{"id":"func/LighthouseProvider.name","name":"LighthouseProvider.name","line":80,"end_line":82,"hash":"b6b9f0ea8a007b0bc47de0fa480327eececbc236db920274adfebb84515770e0"},{"id":"func/LighthouseProvider.capabilities","name":"LighthouseProvider.capabilities","line":84,"end_line":86,"hash":"46a64809d388268fb87e2ebe7550bb608b90b853d6e1fcd091ff93f646c7fe9d"},{"id":"func/LighthouseProvider.headers","name":"LighthouseProvider.headers","line":88,"end_line":93,"hash":"bcee0d0202f66c3ddec14627fa65648ff397179493d30b6c56596fd7f2c8c1be"},{"id":"func/LighthouseProvider.pin","name":"LighthouseProvider.pin","line":95,"end_line":110,"hash":"edb0c51f32768ba87a72a5230073f6f3768b393fac0b7e927e5024f720805a64"},{"id":"func/LighthouseProvider.status","name":"LighthouseProvider.status","line":112,"end_line":116,"hash":"298440b3aefe5d4de9aff533c8d259beccfddf4f1c7ef4f62b6bd3ca79dbe7c5"},{"id":"func/LighthouseProvider.unpin","name":"LighthouseProvider.unpin","line":118,"end_line":128,"hash":"d7c1032faf4894819cfceea795153a3a8e2bc5e2e473216da9b36d14e46440b9"},{"id":"func/LighthouseProvider.gatewayUrl","name":"LighthouseProvider.gatewayUrl","line":130,"end_line":132,"hash":"b4b440b5d30dc42d964a46b020807387be4dd997d9030ed431c7b090d84c8dc9"},{"id":"func/LighthouseProvider.findUpload","name":"LighthouseProvider.findUpload","line":134,"end_line":142,"hash":"3b30ae0f1e72fc68f5bb0e16450918ff04cb7691f99674789b45782bd5d49781"}]}
// mutate4javascript-manifest-end
