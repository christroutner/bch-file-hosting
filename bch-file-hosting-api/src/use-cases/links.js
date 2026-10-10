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

export function buildLinks ({ cid, filename, config = {}, providers = [] }) {
  const base = String(config.publicUrl || '').replace(/\/+$/, '')

  return {
    downloadUrl: `${base}/download/${cid}`,
    viewUrl: `${base}/view/${cid}`,
    gatewayUrls: buildGatewayUrls({ cid, filename, config, providers })
  }
}

export default { buildLinks }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-10T20:13:33.456Z","module_hash":"a8d4c86eab441f8258fc949a8d1a80f8281bbe826f579a33ce5ad83d03f2b4cf","functions":[{"id":"func/buildGatewayUrls","name":"buildGatewayUrls","line":9,"end_line":19,"hash":"6e2fa689d569f56d1821675224d3cadf08c86a9869cdffb29e5a98320a04ec3b"},{"id":"func/buildLinks","name":"buildLinks","line":21,"end_line":29,"hash":"a6b5d209cfcd57cf77d2136e2c97d778b0c86d058c36719bc0915796af5faaa7"}]}
// mutate4javascript-manifest-end
