/*
  Service entry point. Starts the adapters (LevelDB, server wallet, IPFS node,
  pinning registry), the use-cases, the REST API, and the timers. Shuts them
  down in reverse order on SIGINT or SIGTERM.
*/

import { fileURLToPath } from 'url'

import defaultConfig from '../config/index.js'
import Adapters from '../src/adapters/index.js'
import UseCases from '../src/use-cases/index.js'
import Controllers from '../src/controllers/index.js'

class Server {
  constructor ({ config = defaultConfig, adapters, proc = process } = {}) {
    this.config = config
    this.adapters = adapters || new Adapters({ config })
    this.process = proc
    this.isShuttingDown = false

    // Encapsulated for unit tests.
    this.UseCases = UseCases
    this.Controllers = Controllers

    this.useCases = null
    this.controllers = null
    this.httpServer = null

    this.start = this.start.bind(this)
    this.shutdown = this.shutdown.bind(this)
  }

  async start () {
    const { logger } = this.adapters
    logger.info(`Starting bch-file-hosting-api v${this.config.version} (${this.config.env})`)

    await this.adapters.start()

    this.useCases = new this.UseCases({ adapters: this.adapters })
    this.controllers = new this.Controllers({
      useCases: this.useCases,
      adapters: this.adapters,
      config: this.config
    })

    const app = this.controllers.buildApp()
    this.httpServer = await this.listen(app, this.config.port)
    this.controllers.startTimers()

    for (const signal of ['SIGINT', 'SIGTERM']) {
      this.process.once(signal, () => this.shutdown(signal))
    }

    logger.info(`bch-file-hosting-api listening on port ${this.config.port}. Press Ctrl+C to stop.`)
    return true
  }

  listen (app, port) {
    return new Promise((resolve, reject) => {
      const server = app.listen(port)
      server.once('listening', () => resolve(server))
      server.once('error', reject)
    })
  }

  closeHttpServer () {
    if (!this.httpServer) return Promise.resolve()
    return new Promise((resolve) => {
      this.httpServer.close(() => resolve())
      this.httpServer.closeIdleConnections()
    })
  }

  // Stop timers, then HTTP, then the adapters, without exiting the process.
  async stop () {
    if (this.controllers) this.controllers.stopTimers()
    await this.closeHttpServer()
    this.httpServer = null
    await this.adapters.stop()
    return true
  }

  async shutdown (signal) {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    const { logger } = this.adapters
    logger.info(`Received ${signal}, shutting down`)

    try {
      await this.stop()
      logger.info('Shutdown complete')
      this.process.exit(0)
    } catch (err) {
      logger.error(`Error during shutdown: ${err.message}`)
      this.process.exit(1)
    }
  }
}

export default Server

/* c8 ignore start */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = new Server()
  server.start().catch((err) => {
    console.error(`Failed to start bch-file-hosting-api: ${err.message}`)
    process.exit(1)
  })
}
/* c8 ignore stop */
