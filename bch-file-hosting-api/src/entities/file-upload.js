/*
  FileUpload entity. Validates and normalizes an uploaded file's metadata.
*/

import path from 'path'

const MAX_FILENAME_LENGTH = 255

// staged: uploaded, awaiting payment. pinning: paid, pinning in progress.
// pinned: paid and pinned with every required provider. pinFailed: paid, but a
// required provider failed to pin. deleted: unpaid and removed.
export const FILE_STATUS = Object.freeze({
  STAGED: 'staged',
  PINNING: 'pinning',
  PINNED: 'pinned',
  PIN_FAILED: 'pinFailed',
  DELETED: 'deleted'
})

export function isPaidFileStatus (status) {
  return status === FILE_STATUS.PINNING || status === FILE_STATUS.PINNED || status === FILE_STATUS.PIN_FAILED
}

function requireFilename (filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error("Property 'filename' must be a non-empty string")
  }
}

// Strip any client-supplied directory parts and control characters.
function cleanFilename (filename) {
  // eslint-disable-next-line no-control-regex
  return path.basename(filename.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '').trim()
}

function requireUsableFilename (cleanName) {
  if (!cleanName || cleanName === '.' || cleanName === '..') {
    throw new Error("Property 'filename' must contain a usable file name")
  }
  if (cleanName.length > MAX_FILENAME_LENGTH) {
    throw new Error(`Property 'filename' must be at most ${MAX_FILENAME_LENGTH} characters`)
  }
}

function requirePositiveInteger (name, value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Property '${name}' must be a positive integer`)
  }
}

class FileUpload {
  validate ({ filename, sizeBytes, maxFileSizeBytes } = {}) {
    requireFilename(filename)
    const cleanName = cleanFilename(filename)
    requireUsableFilename(cleanName)

    requirePositiveInteger('sizeBytes', sizeBytes)
    requirePositiveInteger('maxFileSizeBytes', maxFileSizeBytes)
    if (sizeBytes > maxFileSizeBytes) {
      throw new Error(`File exceeds the maximum size of ${maxFileSizeBytes} bytes`)
    }

    return { filename: cleanName, sizeBytes }
  }
}

export default FileUpload

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:19:43.609Z","module_hash":"5cf23236818edd2bfd21fcd7a157d4f459ea37a02df1b1c007729562e46cbd39","functions":[{"id":"func/isPaidFileStatus","name":"isPaidFileStatus","line":18,"end_line":20,"hash":"626c22f93fb8f1e2335fc8d61dffff52d3cad090d62101717c9433fd56a3f336"},{"id":"func/requireFilename","name":"requireFilename","line":22,"end_line":26,"hash":"81e1a79e34203b9fdc5c1faabd2199d2e3838fc0f83fcb2e082ab9b763b65b76"},{"id":"func/cleanFilename","name":"cleanFilename","line":29,"end_line":32,"hash":"885eb43b2d9c3158df22cb3531b505ff0d60f0db32a0c2e7ba64567d65529302"},{"id":"func/requireUsableFilename","name":"requireUsableFilename","line":34,"end_line":41,"hash":"0baadd85db17d07a19af3e9c3224e020323de9adda9509fc52afbc570ba0a444"},{"id":"func/requirePositiveInteger","name":"requirePositiveInteger","line":43,"end_line":47,"hash":"8bf70c0ffce6da70bcb7a43ced1ccd84c15f0dccbc03ed07c4e5c9b349560964"},{"id":"func/FileUpload.validate","name":"FileUpload.validate","line":50,"end_line":62,"hash":"ac68a8bf0a75ac0387e5996112ac71a969699cf89ebd325b58ea3b33366d1612"}]}
// mutate4javascript-manifest-end
