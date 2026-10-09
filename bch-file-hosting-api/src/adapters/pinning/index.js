/*
  Pinning provider registry. The local Helia node is always first; third-party
  providers are added in the order listed in PINNING_PROVIDERS.

  To add a provider, implement PinningProvider and add a factory to
  PROVIDER_FACTORIES under the name used in PINNING_PROVIDERS.
*/

import LocalHeliaProvider from './local-helia.js'
import LighthouseProvider from './lighthouse.js'

const PROVIDER_FACTORIES = {
  lighthouse: ({ config }) => new LighthouseProvider({ config })
}

class PinningRegistry {
  constructor ({ ipfs, config, factories = PROVIDER_FACTORIES } = {}) {
    if (!ipfs) throw new Error('PinningRegistry requires the IPFS adapter')
    if (!config) throw new Error('PinningRegistry requires a config object')

    this.providers = [new LocalHeliaProvider({ ipfs })]

    for (const name of config.pinningProviders) {
      const factory = factories[name]
      if (!factory) {
        const known = Object.keys(factories)
        throw new Error(
          `Unknown pinning provider '${name}'. Known providers: ${known.length ? known.join(', ') : 'none'}`
        )
      }
      this.providers.push(factory({ config }))
    }
  }

  getProviders () {
    return [...this.providers]
  }

  getProvider (name) {
    return this.providers.find(p => p.name === name) || null
  }
}

export default PinningRegistry

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:57:04.466Z","module_hash":"0d9bd8b1a640b8b9d174fdb6f89edb726059793642bc759604cb71f3c9ce2d63","functions":[{"id":"func/PinningRegistry.constructor","name":"PinningRegistry.constructor","line":17,"end_line":33,"hash":"b03ab3a43c5cafe2d5aa86100945b3d2637856884857046aa6627c2976d90bd0"},{"id":"func/PinningRegistry.getProviders","name":"PinningRegistry.getProviders","line":35,"end_line":37,"hash":"244a0718a896841fc4360d65c9c52f108fd1e33e588964f013f5f2f79c160817"},{"id":"func/PinningRegistry.getProvider","name":"PinningRegistry.getProvider","line":39,"end_line":41,"hash":"53f4a8027f522f3db6395614aded2710d18c282ccd2e0655009ae8dfe65dc11c"}]}
// mutate4javascript-manifest-end
