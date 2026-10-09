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
}

module.exports = HostingApi
module.exports.HostingApiError = HostingApiError

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T14:46:06.225Z","module_hash":"67168d76332e5a09992ccc1ee641abc4c086b3e75fe8ae71d40cbc47bca24539","functions":[{"id":"func/errorMessage","name":"errorMessage","line":13,"end_line":16,"hash":"1a03b20dbd9e537b1480a4b5856abf09b044b220004fa6431837196c3f5f85c1"},{"id":"func/readJson","name":"readJson","line":18,"end_line":24,"hash":"1605144a2f8c4765cd3f8274c4f04f88196a1a5da92594a9bd59b4fe47866cc6"},{"id":"func/HostingApi.constructor","name":"HostingApi.constructor","line":27,"end_line":33,"hash":"695fabf5fb7174c679cc6448d93955349dcf052d8f38064989bd37a7c6ec7b30"},{"id":"func/HostingApi.upload","name":"HostingApi.upload","line":36,"end_line":51,"hash":"3218086201b94ab5181c669b0c7858a60bca0b0917b6017f18ec11315f61c75f"}]}
// mutate4javascript-manifest-end
