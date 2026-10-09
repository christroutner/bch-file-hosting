/*
  Multipart upload middleware. Accepts one file in the 'file' field and writes
  it to UPLOAD_TMP_DIR. The file-use-cases delete the temp file afterwards.
*/

import multer from 'multer'

export function createUploadMiddleware ({ config }) {
  const upload = multer({
    dest: config.uploadTmpDir,
    limits: {
      fileSize: config.maxFileSizeBytes,
      files: 1
    },
    // Decode file names as UTF-8 instead of latin1.
    defParamCharset: 'utf8'
  })

  return upload.single('file')
}

export default createUploadMiddleware
