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
// {"version":1,"tested_at":"2026-10-11T01:53:10.749Z","module_hash":"46ba8449111ee8a6a6fd4ca51a9ffa369e39bff8c69b65c9d545aa9e1932de9b","functions":[{"id":"func/FilesRouter.constructor","name":"FilesRouter.constructor","line":11,"end_line":18,"hash":"dd97e659d270dd43e0fe8d8e2e0ea9e9b17dd0ec20a7aba8ac7adf2e69ed7e9c"},{"id":"func/FilesRouter.attach","name":"FilesRouter.attach","line":20,"end_line":30,"hash":"38f2b08cbafac74d4aa1a0e174cc7c5b594d5ac5782ddebde62abd92b4d2691a"}]}
// mutate4javascript-manifest-end
