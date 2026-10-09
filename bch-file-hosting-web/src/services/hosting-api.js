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
