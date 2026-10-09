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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:28:12.900Z","module_hash":"63b76b87452dc8cdc86d002a13581950d76b99d912b20e7d1ab7ac1091b8dc65","functions":[{"id":"func/Server.constructor","name":"Server.constructor","line":15,"end_line":31,"hash":"67ac4b25032d861b20247686d5494451aef829d878f8d599cd299706bef3467e"},{"id":"func/Server.start","name":"Server.start","line":33,"end_line":56,"hash":"3276765550e2676f5cbca9abbe99d024fd667b5cb1b6c7d94c96cdcce28689e9"},{"id":"func/Server.listen","name":"Server.listen","line":58,"end_line":64,"hash":"b1987cc523f7c735c8f3a43f4ab1f4e4b965e39453fbdb23d51e4a690b394b64"},{"id":"func/Server.closeHttpServer","name":"Server.closeHttpServer","line":66,"end_line":72,"hash":"3449aa41788965ac5f18159519bd1fe54f5dadfb26654f6c00b99255b68a14a1"},{"id":"func/Server.stop","name":"Server.stop","line":75,"end_line":81,"hash":"84f90ad7d5d67f3ff5785542f281a805e56d30efbb3343cbaaf710f53c28cf7c"},{"id":"func/Server.shutdown","name":"Server.shutdown","line":83,"end_line":98,"hash":"08e7d8ffee057251f3088e69195e0d61957334ed2827d41f100b1a7368f05644"}]}
// mutate4javascript-manifest-end
