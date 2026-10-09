/*
  FileUpload entity. Validates and normalizes an uploaded file's metadata.
*/

import path from 'path'

const MAX_FILENAME_LENGTH = 255

// staged: uploaded, awaiting payment. pinned: paid and pinned everywhere.
// pinFailed: paid, but at least one provider failed to pin. deleted: unpaid and removed.
export const FILE_STATUS = Object.freeze({
  STAGED: 'staged',
  PINNED: 'pinned',
  PIN_FAILED: 'pinFailed',
  DELETED: 'deleted'
})

export function isPaidFileStatus (status) {
  return status === FILE_STATUS.PINNED || status === FILE_STATUS.PIN_FAILED
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
