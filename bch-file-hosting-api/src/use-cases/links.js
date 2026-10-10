/*
  Builds the download links returned for a hosted file. CIDs are wrapping
  directories, so gateway links include the file name to open the file itself.
*/

// Public gateway URLs for a hosted file: each configured prefix followed by
// the CID and the URL-encoded file name, plus any provider gateway the active
// providers offer.
export function buildGatewayUrls ({ cid, filename, config = {}, providers = [] }) {
  const encodedName = encodeURIComponent(filename)

  const gatewayUrls = (config.publicGateways || []).map(prefix => `${prefix}${cid}/${encodedName}`)
  for (const provider of providers) {
    const url = provider.gatewayUrl(cid, filename)
    if (url) gatewayUrls.push(url)
  }

  return gatewayUrls
}

export function buildLinks ({ cid, filename, config, providers = [] }) {
  const base = config.publicUrl.replace(/\/+$/, '')

  return {
    downloadUrl: `${base}/download/${cid}`,
    gatewayUrls: buildGatewayUrls({ cid, filename, config, providers })
  }
}

export default { buildLinks }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T16:51:41.653Z","module_hash":"dca89cf3f33559785362af98502eb9f02cf45a725a46d09cea0c9fdd7152ebc6","functions":[{"id":"func/buildLinks","name":"buildLinks","line":6,"end_line":20,"hash":"aedaa7c0399303bd3fcbb1b6495f0e4d6978c4c15a5e6fcaa360804022b94c9d"}]}
// mutate4javascript-manifest-end
