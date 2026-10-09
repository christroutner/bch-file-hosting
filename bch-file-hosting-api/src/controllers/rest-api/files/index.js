/*
  Routes for the public file hosting workflow.
*/

import express from 'express'

import FilesController from './controller.js'
import { createUploadMiddleware } from '../middleware/upload.js'

class FilesRouter {
  constructor ({ useCases, config, logger, rateLimiter } = {}) {
    if (!useCases) throw new Error('FilesRouter requires the use-cases')
    if (!config) throw new Error('FilesRouter requires a config object')

    this.controller = new FilesController({ useCases, logger })
    this.upload = createUploadMiddleware({ config })
    this.rateLimiter = rateLimiter
  }

  attach (app) {
    const limit = this.rateLimiter || ((req, res, next) => next())

    app.post('/files', limit, this.upload, this.controller.uploadFile)
    app.post('/files/check-payment', limit, express.json(), this.controller.checkPayment)
    app.get('/files/:cid', limit, this.controller.getFileStatus)
    app.get('/download/:cid', limit, this.controller.downloadFile)
  }
}

export default FilesRouter
