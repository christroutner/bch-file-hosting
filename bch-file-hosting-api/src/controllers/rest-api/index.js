/*
  Builds the Express app: shared middleware, the public and admin routes,
  /health, and the 404 and error handlers.
*/

import express from 'express'
import cors from 'cors'

import FilesRouter from './files/index.js'
import AdminRouter from './admin/index.js'
import { createRateLimiter } from './middleware/rate-limit.js'
import { createErrorHandler, notFoundHandler } from './middleware/errors.js'

class RestApi {
  constructor ({ useCases, adapters, config } = {}) {
    if (!useCases) throw new Error('RestApi requires the use-cases')
    if (!adapters) throw new Error('RestApi requires the adapters')
    if (!config) throw new Error('RestApi requires a config object')

    this.useCases = useCases
    this.adapters = adapters
    this.config = config

    this.health = this.health.bind(this)
  }

  buildApp () {
    const app = express()
    app.disable('x-powered-by')
    if (this.config.trustProxy) app.set('trust proxy', 1)

    app.use(cors())

    app.get('/health', this.health)

    const rateLimiter = createRateLimiter({ config: this.config })
    new FilesRouter({ useCases: this.useCases, config: this.config, logger: this.adapters.logger, rateLimiter }).attach(app)
    new AdminRouter({ useCases: this.useCases, config: this.config }).attach(app)

    app.use(notFoundHandler)
    app.use(createErrorHandler({ logger: this.adapters.logger, config: this.config }))

    return app
  }

  /**
   * @api {get} /health Service health
   */
  health (req, res) {
    const ipfsStatus = this.adapters.ipfs.getStatus()
    const dbOpen = this.adapters.localdb.isOpen()
    const healthy = ipfsStatus.isReady && dbOpen

    res.status(healthy ? 200 : 503).json({
      success: healthy,
      version: this.config.version,
      ipfs: ipfsStatus.isReady ? 'up' : 'down',
      db: dbOpen ? 'up' : 'down'
    })
  }
}

export default RestApi

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:27:09.044Z","module_hash":"8f5bb3d759dba821560c76ee36f19d16bacd93cc5f396df92fe5261a79640e5c","functions":[{"id":"func/RestApi.constructor","name":"RestApi.constructor","line":15,"end_line":25,"hash":"4b4e89f2609afde75921338f8b7ab2c7714363983d08135025d621d67a16a9bc"},{"id":"func/RestApi.buildApp","name":"RestApi.buildApp","line":27,"end_line":44,"hash":"37c68e7054bb3c4bb2122ba8f7de25a4c49e4235f019844ba525a1f576ab0a8c"},{"id":"func/RestApi.health","name":"RestApi.health","line":49,"end_line":60,"hash":"81116810e8c1bfa22bf09b4985e19029c8e8f4ff93656e9f4f08b0a97640135e"}]}
// mutate4javascript-manifest-end
