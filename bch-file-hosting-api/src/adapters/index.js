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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:26:58.506Z","module_hash":"4ef083931e3598d41d7f0c2d7101a602dce5cec082e4af4181d5b552efde9eea","functions":[{"id":"func/Adapters.constructor","name":"Adapters.constructor","line":15,"end_line":28,"hash":"0ce8512d281d2caae23946f7c2983c6bea8a8cd501284ebc22545c8e55407950"},{"id":"func/Adapters.start","name":"Adapters.start","line":30,"end_line":46,"hash":"8524cdfc01cec2d44ce265c12ec84efd78976d9d1e48248b3498e8ba5bb990e6"},{"id":"func/Adapters.stop","name":"Adapters.stop","line":48,"end_line":52,"hash":"db633596f523689b09d565ca67d8a6a4d84a46bc645377710a05e8ade6e208f7"}]}
// mutate4javascript-manifest-end
