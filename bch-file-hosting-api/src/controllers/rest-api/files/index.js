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
    app.get('/files', limit, this.controller.listFiles)
    app.get('/files/:cid', limit, this.controller.getFileStatus)
    app.get('/download/:cid', limit, this.controller.downloadFile)
    app.get('/view/:cid', limit, this.controller.viewFile)
    app.get('/view/:cid/:filename', limit, this.controller.viewFile)
  }
}

export default FilesRouter

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T20:06:01.189Z","module_hash":"b778e303407c4067047951d23a0dfd736b4c4dcab806ff1c6b3f65b093a8850d","functions":[{"id":"func/FilesRouter.constructor","name":"FilesRouter.constructor","line":11,"end_line":18,"hash":"dd97e659d270dd43e0fe8d8e2e0ea9e9b17dd0ec20a7aba8ac7adf2e69ed7e9c"},{"id":"func/FilesRouter.attach","name":"FilesRouter.attach","line":20,"end_line":28,"hash":"432899f7f65dff63b78c909a97ca5c112803e132cbe0481fec202d97e7282054"}]}
// mutate4javascript-manifest-end
