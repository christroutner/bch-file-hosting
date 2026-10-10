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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-10T20:13:15.310Z","module_hash":"8a2eaff255fc7c62896558fd1cc8b27fe87b2a344292dc1eefa5544e4065a97d","functions":[{"id":"func/viewType","name":"viewType","line":24,"end_line":30,"hash":"3a9bba89d4d519d4afe1a7c9a356221cdd77c53e3a40d8862ef17e62457992b8"}]}
// mutate4javascript-manifest-end
