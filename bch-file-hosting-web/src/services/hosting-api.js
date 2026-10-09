/*
  Adapter boundary for the bch-file-hosting REST API.

  The web client talks to the API through this small class so the upload view
  can be unit tested without a network. `fetch` and `FormData` are injected so
  tests can stub them.
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

// True when a feed option was actually supplied. The API applies its own
// default for a missing limit or cursor, so those are left out of the query.
function hasValue (value) {
  return value !== undefined && value !== null && value !== ''
}

// Query string for the feed page. The cursor is opaque and passed through as
// the caller supplied it.
function buildFeedQuery ({ limit, cursor } = {}) {
  const params = new URLSearchParams()
  if (hasValue(limit)) params.set('limit', String(limit))
  if (hasValue(cursor)) params.set('cursor', String(cursor))
  return params.toString()
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
    this.getFeed = this.getFeed.bind(this)
  }

  // Send one API request and return its parsed JSON body, throwing the server's
  // error message on a non-2xx response. Shared by every endpoint so the error
  // contract lives in one place.
  async request (path, options) {
    const response = await this.fetch(`${this.config.apiUrl}${path}`, options)
    const body = await readJson(response)

    if (!response.ok) {
      throw new HostingApiError(errorMessage(response, body))
    }

    return body
  }

  // Upload a browser File to POST /files and return the parsed quote response.
  async upload (file) {
    const form = new this.FormData()
    form.append('file', file, file.name)

    return this.request('/files', { method: 'POST', body: form })
  }

  // Ask whether an invoice has been paid at POST /files/check-payment. The
  // response status is 'unpaid', 'expired', or 'paid'.
  async checkPayment ({ paymentAddress } = {}) {
    return this.request('/files/check-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentAddress })
    })
  }

  // Look up a file record at GET /files/:cid. The CID is a single path
  // segment, so it is percent-encoded: an unencoded value such as
  // `../admin/invoices` would be normalized by the URL parser and change the
  // requested endpoint.
  async getStatus ({ cid } = {}) {
    return this.request(`/files/${encodeURIComponent(cid)}`, { method: 'GET' })
  }

  // List the public feed at GET /files. The page is limited and paginated by
  // the opaque cursor returned with the previous page.
  async getFeed ({ limit, cursor } = {}) {
    const query = buildFeedQuery({ limit, cursor })

    return this.request(`/files${query ? `?${query}` : ''}`, { method: 'GET' })
  }
}

module.exports = HostingApi
module.exports.HostingApiError = HostingApiError

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T20:06:27.785Z","module_hash":"040faf6a5fe2b9aaf98e3b4962cd267a438bfc385273d6e98f89e1091559b426","functions":[{"id":"func/errorMessage","name":"errorMessage","line":13,"end_line":16,"hash":"1a03b20dbd9e537b1480a4b5856abf09b044b220004fa6431837196c3f5f85c1"},{"id":"func/readJson","name":"readJson","line":18,"end_line":24,"hash":"1605144a2f8c4765cd3f8274c4f04f88196a1a5da92594a9bd59b4fe47866cc6"},{"id":"func/hasValue","name":"hasValue","line":28,"end_line":30,"hash":"cab10bfa8e5525e84e6f69eeb2332806e06234a80dd04011c15e3a78c999271b"},{"id":"func/buildFeedQuery","name":"buildFeedQuery","line":34,"end_line":39,"hash":"c0c297fb9763226c4e784e42c78051224cbb6b41d3365656a8ebfb56da9ecd82"},{"id":"func/HostingApi.constructor","name":"HostingApi.constructor","line":42,"end_line":54,"hash":"125743d600d74dbc4d0526fa7c6180009a7039371c192e1f5ca9bff7ed40b5f4"},{"id":"func/HostingApi.request","name":"HostingApi.request","line":59,"end_line":68,"hash":"1611690ac82d9bd5e62e24678ae05a3803bce946c7becf8aee89208da4d545b3"},{"id":"func/HostingApi.upload","name":"HostingApi.upload","line":71,"end_line":76,"hash":"10b7f760c1eb3f4ba50ec9b14dfd9466081aa1f953dc9f6de1afea52abde0766"},{"id":"func/HostingApi.checkPayment","name":"HostingApi.checkPayment","line":80,"end_line":86,"hash":"32ec1490031263f0d66977bf89ad8cd47ebe973675843785112f75790bc7c308"},{"id":"func/HostingApi.getStatus","name":"HostingApi.getStatus","line":92,"end_line":94,"hash":"e6dc60d5b597ec76ad84a0715fc9606e482f175d3331bb50dc95aca0bddd460f"},{"id":"func/HostingApi.getFeed","name":"HostingApi.getFeed","line":98,"end_line":102,"hash":"bbf5e00ece1e158c8214d6203665b36c8412700794f62dc89cdb8dc200f968fa"}]}
// mutate4javascript-manifest-end
