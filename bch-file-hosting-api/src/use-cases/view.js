/*
  Maps a stored file name to the headers used when viewing it through
  GET /view/:cid. Images and videos are served inline with their content type;
  every other type is downloaded as an octet stream.
*/

const INLINE_CONTENT_TYPES = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['svg', 'image/svg+xml'],
  ['bmp', 'image/bmp'],
  ['avif', 'image/avif'],
  ['mp4', 'video/mp4'],
  ['webm', 'video/webm'],
  ['ogg', 'video/ogg']
])

export const DEFAULT_CONTENT_TYPE = 'application/octet-stream'

// The content type and Content-Disposition a view response uses for a file.
export function viewType (filename) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(filename ?? '').trim())
  const contentType = match ? INLINE_CONTENT_TYPES.get(match[1].toLowerCase()) : undefined

  if (!contentType) return { contentType: DEFAULT_CONTENT_TYPE, disposition: 'attachment' }
  return { contentType, disposition: 'inline' }
}

export default { viewType }
