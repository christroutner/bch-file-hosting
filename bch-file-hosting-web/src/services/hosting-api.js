/*
  Adapter boundary for the bch-file-hosting REST API.

  The web client talks to the API through this small class so the upload view
  can be unit tested without a network. `fetch` and `FormData` are injected so
  tests can stub them.
*/

'use strict'

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
  constructor ({ config, fetch: fetchImpl, FormData: FormDataImpl } = {}) {
    this.config = config
    // A browser's native fetch rejects any receiver other than the global
    // object. Bind the transport before storing it so calling `this.fetch(...)`
    // inside this adapter still invokes it with the browser receiver.
    this.fetch = (fetchImpl || fetch).bind(globalThis)
    this.FormData = FormDataImpl || FormData

    this.upload = this.upload.bind(this)
    this.checkPayment = this.checkPayment.bind(this)
    this.getStatus = this.getStatus.bind(this)
  }

  // Upload a browser File to POST /files and return the parsed quote response.
  async upload (file) {
    const form = new this.FormData()
    form.append('file', file, file.name)

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

  // Ask whether an invoice has been paid at POST /files/check-payment. The
  // response status is 'unpaid', 'expired', or 'paid'.
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

  // Look up a file record at GET /files/:cid. The CID is a single path
  // segment, so it is percent-encoded: an unencoded value such as
  // `../admin/invoices` would be normalized by the URL parser and change the
  // requested endpoint.
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

module.exports = HostingApi
module.exports.HostingApiError = HostingApiError

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T16:11:59.350Z","module_hash":"6a3d6c2c6794f015158aaf3e56c5c59b9ba404b91828a9279053488ab55fb48a","functions":[{"id":"func/errorMessage","name":"errorMessage","line":13,"end_line":16,"hash":"1a03b20dbd9e537b1480a4b5856abf09b044b220004fa6431837196c3f5f85c1"},{"id":"func/readJson","name":"readJson","line":18,"end_line":24,"hash":"1605144a2f8c4765cd3f8274c4f04f88196a1a5da92594a9bd59b4fe47866cc6"},{"id":"func/HostingApi.constructor","name":"HostingApi.constructor","line":27,"end_line":38,"hash":"10d2e0461aa24627832ebdf5044200a252bd580049ee608738c50f642ccd5031"},{"id":"func/HostingApi.upload","name":"HostingApi.upload","line":41,"end_line":56,"hash":"3218086201b94ab5181c669b0c7858a60bca0b0917b6017f18ec11315f61c75f"},{"id":"func/HostingApi.checkPayment","name":"HostingApi.checkPayment","line":60,"end_line":73,"hash":"cebcbf9fdc63ec05eeceb4d158f6b073c81241dbd56788cb0da85ea4e36f9319"},{"id":"func/HostingApi.getStatus","name":"HostingApi.getStatus","line":79,"end_line":90,"hash":"eef2352585a61a1e0d2e6c027848b5c73d0f21738b080171afdcf0ecf4716893"}]}
// mutate4javascript-manifest-end
