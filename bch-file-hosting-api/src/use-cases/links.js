/*
  Builds the download links returned for a hosted file. CIDs are wrapping
  directories, so gateway links include the file name to open the file itself.
*/

export function buildLinks ({ cid, filename, config, providers = [] }) {
  const base = config.publicUrl.replace(/\/+$/, '')
  const encodedName = encodeURIComponent(filename)

  const gatewayUrls = config.publicGateways.map(prefix => `${prefix}${cid}/${encodedName}`)
  for (const provider of providers) {
    const url = provider.gatewayUrl(cid)
    if (url) gatewayUrls.push(url)
  }

  return {
    downloadUrl: `${base}/download/${cid}`,
    gatewayUrls
  }
}

export default { buildLinks }
