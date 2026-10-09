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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:22:51.780Z","module_hash":"b9a253bf3e528432a9affc2f0961aceaccc56c8fecf26b91d4596691700c2812","functions":[{"id":"func/createUploadMiddleware","name":"createUploadMiddleware","line":8,"end_line":20,"hash":"9f8a82114a1975a38edbe33982511346949dbca2d8fae121f9629b471599046f"}]}
// mutate4javascript-manifest-end
