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
  // A browser's native fetch rejects any receiver other than the global
  // object. Bind the transport before storing it so calling `this.fetch(...)`
  // inside this adapter still invokes it with the global receiver.
  constructor ({ config, fetch: fetchImpl } = {}) {
    this.config = config
    this.fetch = (fetchImpl || fetch).bind(globalThis)

    this.upload = this.upload.bind(this)
    this.checkPayment = this.checkPayment.bind(this)
    this.getStatus = this.getStatus.bind(this)
    this.listFiles = this.listFiles.bind(this)
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

  // List the public feed at GET /files. The limit and cursor are optional; the
  // cursor is opaque and must be passed back exactly as the feed returned it.
  async listFiles ({ limit, cursor } = {}) {
    const params = new URLSearchParams()
    if (limit !== undefined) params.set('limit', limit)
    if (cursor !== undefined) params.set('cursor', cursor)
    const query = params.toString()

    const response = await this.fetch(`${this.config.apiUrl}/files${query ? `?${query}` : ''}`, {
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
// {"version":1,"tested_at":"2026-10-11T13:34:25.018Z","module_hash":"4a4df694bd572b60b9097d4a1be9a3454a99570250e63cefbf7c891b56e0faeb","functions":[{"id":"func/errorMessage","name":"errorMessage","line":10,"end_line":13,"hash":"1a03b20dbd9e537b1480a4b5856abf09b044b220004fa6431837196c3f5f85c1"},{"id":"func/readJson","name":"readJson","line":15,"end_line":21,"hash":"1605144a2f8c4765cd3f8274c4f04f88196a1a5da92594a9bd59b4fe47866cc6"},{"id":"func/HostingApi.constructor","name":"HostingApi.constructor","line":24,"end_line":32,"hash":"ec0050d8c39a93915f79eb48dcb0670e3e4a2f7c14586bab5826daaf7a107efb"},{"id":"func/HostingApi.upload","name":"HostingApi.upload","line":35,"end_line":50,"hash":"d416c2d9baefbae6116d1bb609debc42124f964afd1631d6d8f973687cce169d"},{"id":"func/HostingApi.checkPayment","name":"HostingApi.checkPayment","line":53,"end_line":66,"hash":"cebcbf9fdc63ec05eeceb4d158f6b073c81241dbd56788cb0da85ea4e36f9319"},{"id":"func/HostingApi.getStatus","name":"HostingApi.getStatus","line":71,"end_line":82,"hash":"eef2352585a61a1e0d2e6c027848b5c73d0f21738b080171afdcf0ecf4716893"},{"id":"func/HostingApi.listFiles","name":"HostingApi.listFiles","line":86,"end_line":102,"hash":"f324dccc9d6d0fa186eaac7ec50582766365f96e61b364d65ac8e3b0f7a30fb4"}]}
// mutate4javascript-manifest-end
