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
