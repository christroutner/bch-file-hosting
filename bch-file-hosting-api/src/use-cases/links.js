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
// {"version":1,"tested_at":"2026-10-10T00:52:53.051Z","module_hash":"ddf2a768e98ec9daff4995a6b4266aa12d992b6cbf6e7f4c348eb2465a92f988","functions":[{"id":"func/buildGatewayUrls","name":"buildGatewayUrls","line":9,"end_line":19,"hash":"6e2fa689d569f56d1821675224d3cadf08c86a9869cdffb29e5a98320a04ec3b"},{"id":"func/buildLinks","name":"buildLinks","line":21,"end_line":28,"hash":"d073389061b37ced3cb6e60e17e6e0e8934cfa42016cb459a84c4cd822d9e6c2"}]}
// mutate4javascript-manifest-end
