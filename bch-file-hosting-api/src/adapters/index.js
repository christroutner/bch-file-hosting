/*
  Top-level adapters library. Creates every output adapter and starts them in
  dependency order: database, wallet, IPFS node, then the pinning registry
  (which needs the running IPFS node).
*/

import { createLogger } from './logger.js'
import LocalDB from './localdb/index.js'
import WalletAdapter from './wallet.adapter.js'
import IpfsAdapter from './ipfs/index.js'
import PinningRegistry from './pinning/index.js'
import NoopAnnouncer from './announcement/noop-announcer.js'

class Adapters {
  constructor ({ config } = {}) {
    if (!config) throw new Error('Adapters requires a config object')
    this.config = config

    this.logger = createLogger({ config })
    this.localdb = new LocalDB({ config })
    this.wallet = new WalletAdapter({ config })
    this.ipfs = new IpfsAdapter({ config, logger: this.logger })
    this.announcer = new NoopAnnouncer()

    // Encapsulated for unit tests.
    this.PinningRegistry = PinningRegistry
    this.pinning = null
  }

  async start () {
    await this.localdb.open()
    this.logger.info('LevelDB opened')

    await this.wallet.init()
    this.logger.info('Server wallet opened')

    await this.ipfs.start()
    this.logger.info('IPFS node started', { ipfsId: this.ipfs.getStatus().ipfsId })

    this.pinning = new this.PinningRegistry({ ipfs: this.ipfs, config: this.config })
    this.logger.info('Pinning providers ready', {
      providers: this.pinning.getProviders().map(p => p.name)
    })

    return true
  }

  async stop () {
    await this.ipfs.stop()
    await this.localdb.close()
    return true
  }
}

export default Adapters
