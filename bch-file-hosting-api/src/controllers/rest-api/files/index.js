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
  }
}

export default FilesRouter

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:22:16.973Z","module_hash":"dd09770a2e239fc081fec5ce5cbbadafe2037520577b24c477497f5149d9bd10","functions":[{"id":"func/FilesRouter.constructor","name":"FilesRouter.constructor","line":11,"end_line":18,"hash":"dd97e659d270dd43e0fe8d8e2e0ea9e9b17dd0ec20a7aba8ac7adf2e69ed7e9c"},{"id":"func/FilesRouter.attach","name":"FilesRouter.attach","line":20,"end_line":27,"hash":"97f8b4db931818a2b79769ca03bd0a1746da394a59faed857280c67a37a6287e"}]}
// mutate4javascript-manifest-end
