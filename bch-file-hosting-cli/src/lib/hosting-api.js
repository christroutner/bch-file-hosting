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
}

export { HostingApiError }
export default HostingApi

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T03:36:10.318Z","module_hash":"60aaa25e22c49e35e216ef386e1b54957f98b6e57915a6307bd30e08029ee140","functions":[{"id":"func/errorMessage","name":"errorMessage","line":10,"end_line":13,"hash":"1a03b20dbd9e537b1480a4b5856abf09b044b220004fa6431837196c3f5f85c1"},{"id":"func/readJson","name":"readJson","line":15,"end_line":21,"hash":"1605144a2f8c4765cd3f8274c4f04f88196a1a5da92594a9bd59b4fe47866cc6"},{"id":"func/HostingApi.constructor","name":"HostingApi.constructor","line":24,"end_line":29,"hash":"7568860b83c6e9b646d6858069f266cfd6def8c8261640e474ad9da182bca466"},{"id":"func/HostingApi.upload","name":"HostingApi.upload","line":32,"end_line":47,"hash":"d416c2d9baefbae6116d1bb609debc42124f964afd1631d6d8f973687cce169d"}]}
// mutate4javascript-manifest-end
