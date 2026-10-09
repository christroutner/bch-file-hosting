/*
  Service entry point. Starts the adapters (LevelDB, server wallet, IPFS node,
  pinning registry) and shuts them down cleanly on SIGINT or SIGTERM.
  The REST API is attached here in milestone 5 of the short-term plan.
*/

import { fileURLToPath } from 'url'

import defaultConfig from '../config/index.js'
import Adapters from '../src/adapters/index.js'

class Server {
  constructor ({ config = defaultConfig, adapters, proc = process } = {}) {
    this.config = config
    this.adapters = adapters || new Adapters({ config })
    this.process = proc
    this.isShuttingDown = false

    this.start = this.start.bind(this)
    this.shutdown = this.shutdown.bind(this)
  }

  async start () {
    const { logger } = this.adapters
    logger.info(`Starting bch-file-hosting-api v${this.config.version} (${this.config.env})`)

    await this.adapters.start()

    for (const signal of ['SIGINT', 'SIGTERM']) {
      this.process.once(signal, () => this.shutdown(signal))
    }

    logger.info('bch-file-hosting-api is ready. Press Ctrl+C to stop.')
    return true
  }

  async shutdown (signal) {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    const { logger } = this.adapters
    logger.info(`Received ${signal}, shutting down`)

    try {
      await this.adapters.stop()
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
