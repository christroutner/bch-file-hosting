/*
  Adapter boundary for the bch-file-hosting REST API.

  The CLI talks to the API through this small class so the command layer can be
  unit tested without a network. `fetch` is injected so tests can stub it.
*/

class HostingApiError extends Error {}

function errorMessage (response, body) {
  if (body && typeof body.error === 'string' && body.error) return body.error
  return `Hosting API request failed with HTTP ${response.status}`
}

async function readJson (response) {
  try {
    return await response.json()
  } catch (err) {
    return null
  }
}

class HostingApi {
  constructor ({ config, fetch = globalThis.fetch } = {}) {
    this.config = config
    this.fetch = fetch

    this.upload = this.upload.bind(this)
    this.checkPayment = this.checkPayment.bind(this)
    this.getStatus = this.getStatus.bind(this)
  }

  // Upload a file buffer to POST /files and return the parsed quote response.
  async upload ({ filename, buffer } = {}) {
    const form = new FormData()
    form.append('file', new Blob([buffer]), filename)

    const response = await this.fetch(`${this.config.apiUrl}/files`, {
      method: 'POST',
      body: form
    })
    const body = await readJson(response)

    if (!response.ok) {
      throw new HostingApiError(errorMessage(response, body))
    }

    return body
  }

  // Check a payment address at POST /files/check-payment.
  async checkPayment ({ paymentAddress } = {}) {
    const response = await this.fetch(`${this.config.apiUrl}/files/check-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentAddress })
    })
    const body = await readJson(response)

    if (!response.ok) {
      throw new HostingApiError(errorMessage(response, body))
    }

    return body
  }

  // Look up a file record at GET /files/:cid. The CID is a path segment, so
  // encode it: an unencoded value such as `../admin/invoices` would be
  // normalized by the URL parser and change the requested endpoint.
  async getStatus ({ cid } = {}) {
    const response = await this.fetch(`${this.config.apiUrl}/files/${encodeURIComponent(cid)}`, {
      method: 'GET'
    })
    const body = await readJson(response)

    if (!response.ok) {
      throw new HostingApiError(errorMessage(response, body))
    }

    return body
  }
}

export { HostingApiError }
export default HostingApi

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T13:32:44.833Z","module_hash":"781bdc3ceec114772c9cbbaf70ef11f87a9af5314d83ac78aca18cc53561bcb8","functions":[{"id":"func/errorMessage","name":"errorMessage","line":10,"end_line":13,"hash":"1a03b20dbd9e537b1480a4b5856abf09b044b220004fa6431837196c3f5f85c1"},{"id":"func/readJson","name":"readJson","line":15,"end_line":21,"hash":"1605144a2f8c4765cd3f8274c4f04f88196a1a5da92594a9bd59b4fe47866cc6"},{"id":"func/HostingApi.constructor","name":"HostingApi.constructor","line":24,"end_line":31,"hash":"704cd7fdd640bff491b808759882d08f4fdc32707a21e264063619da6ce60174"},{"id":"func/HostingApi.upload","name":"HostingApi.upload","line":34,"end_line":49,"hash":"d416c2d9baefbae6116d1bb609debc42124f964afd1631d6d8f973687cce169d"},{"id":"func/HostingApi.checkPayment","name":"HostingApi.checkPayment","line":52,"end_line":65,"hash":"cebcbf9fdc63ec05eeceb4d158f6b073c81241dbd56788cb0da85ea4e36f9319"},{"id":"func/HostingApi.getStatus","name":"HostingApi.getStatus","line":70,"end_line":81,"hash":"eef2352585a61a1e0d2e6c027848b5c73d0f21738b080171afdcf0ecf4716893"}]}
// mutate4javascript-manifest-end
