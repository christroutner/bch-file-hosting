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
    this.fetch = fetchImpl || fetch
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
// {"version":1,"tested_at":"2026-10-09T15:19:50.544Z","module_hash":"a9ffcc4c9e013e7576dac6e5a56e99a5c445806ed033518046a858fe60b3eea5","functions":[{"id":"func/errorMessage","name":"errorMessage","line":13,"end_line":16,"hash":"1a03b20dbd9e537b1480a4b5856abf09b044b220004fa6431837196c3f5f85c1"},{"id":"func/readJson","name":"readJson","line":18,"end_line":24,"hash":"1605144a2f8c4765cd3f8274c4f04f88196a1a5da92594a9bd59b4fe47866cc6"},{"id":"func/HostingApi.constructor","name":"HostingApi.constructor","line":27,"end_line":34,"hash":"335a4a583d4b7075491abf672bf346e4d1595e18165233fff74405b82725df19"},{"id":"func/HostingApi.upload","name":"HostingApi.upload","line":37,"end_line":52,"hash":"3218086201b94ab5181c669b0c7858a60bca0b0917b6017f18ec11315f61c75f"},{"id":"func/HostingApi.checkPayment","name":"HostingApi.checkPayment","line":56,"end_line":69,"hash":"cebcbf9fdc63ec05eeceb4d158f6b073c81241dbd56788cb0da85ea4e36f9319"}]}
// mutate4javascript-manifest-end
