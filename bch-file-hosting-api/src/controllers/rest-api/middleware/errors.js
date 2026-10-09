/*
  Maps errors to JSON responses. Use-case errors carry their own status;
  unexpected errors return a generic 500 so internals are never leaked.
*/

import multer from 'multer'

const MULTER_ERRORS = {
  LIMIT_FILE_SIZE: {
    status: 413,
    message: (config) => `File exceeds the maximum size of ${config.maxFileSizeBytes} bytes`
  },
  LIMIT_FILE_COUNT: {
    status: 422,
    message: () => "Upload exactly one file in the multipart field 'file'"
  },
  LIMIT_UNEXPECTED_FILE: {
    status: 422,
    message: () => "Upload exactly one file in the multipart field 'file'"
  }
}

export function notFoundHandler (req, res) {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` })
}

export function createErrorHandler ({ logger, config }) {
  // Express identifies error handlers by their four arguments.
  return function errorHandler (err, req, res, next) { // eslint-disable-line no-unused-vars
    if (err instanceof multer.MulterError) {
      const known = MULTER_ERRORS[err.code]
      if (!known) return res.status(400).json({ success: false, error: err.message })
      return res.status(known.status).json({ success: false, error: known.message(config) })
    }

    // Malformed JSON bodies from express.json().
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, error: 'Request body is not valid JSON' })
    }

    if (err.status && err.status < 500) {
      return res.status(err.status).json({ success: false, error: err.message })
    }

    logger.error(`Unhandled error on ${req.method} ${req.path}: ${err.stack || err.message}`)
    if (res.headersSent) return res.destroy()
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
