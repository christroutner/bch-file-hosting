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
