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

class FileUpload {
  validate ({ filename, sizeBytes, maxFileSizeBytes } = {}) {
    if (!filename || typeof filename !== 'string') {
      throw new Error("Property 'filename' must be a non-empty string")
    }

    // Strip any client-supplied directory parts and control characters.
    // eslint-disable-next-line no-control-regex
    const cleanName = path.basename(filename.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '').trim()
    if (!cleanName || cleanName === '.' || cleanName === '..') {
      throw new Error("Property 'filename' must contain a usable file name")
    }
    if (cleanName.length > MAX_FILENAME_LENGTH) {
      throw new Error(`Property 'filename' must be at most ${MAX_FILENAME_LENGTH} characters`)
    }

    if (!Number.isInteger(sizeBytes) || sizeBytes < 0) {
      throw new Error("Property 'sizeBytes' must be a non-negative integer")
    }
    if (!Number.isInteger(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
      throw new Error("Property 'maxFileSizeBytes' must be a positive integer")
    }
    if (sizeBytes > maxFileSizeBytes) {
      throw new Error(`File exceeds the maximum size of ${maxFileSizeBytes} bytes`)
    }

    return { filename: cleanName, sizeBytes }
  }
}

export default FileUpload
