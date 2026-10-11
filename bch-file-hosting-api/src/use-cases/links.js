/*
  Builds the download links returned for a hosted file. CIDs are wrapping
  directories, so gateway links include the file name to open the file itself.
  The view link ends with the stored, URL-encoded file name; the legacy
  CID-only view link still resolves for backward compatibility.
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
    viewUrl: `${base}/view/${cid}/${encodeURIComponent(filename)}`,
    gatewayUrls: buildGatewayUrls({ cid, filename, config, providers })
  }
}

export default { buildLinks }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T01:53:00.839Z","module_hash":"b6750292bb4175d24402fa4400d258d875b01784c47950723072ac777176c96d","functions":[{"id":"func/buildGatewayUrls","name":"buildGatewayUrls","line":11,"end_line":21,"hash":"6e2fa689d569f56d1821675224d3cadf08c86a9869cdffb29e5a98320a04ec3b"},{"id":"func/buildLinks","name":"buildLinks","line":23,"end_line":31,"hash":"c893773ef6b86f731fcecb6c3780f8d596f60885ad2ea20e2a95062c358b9d38"}]}
// mutate4javascript-manifest-end
