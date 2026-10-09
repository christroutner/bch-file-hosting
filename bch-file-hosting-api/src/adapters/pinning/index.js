/*
  Pinning provider registry. The local Helia node is always first; third-party
  providers are added in the order listed in PINNING_PROVIDERS.

  To add a provider, implement PinningProvider and add a factory to
  PROVIDER_FACTORIES under the name used in PINNING_PROVIDERS.
*/

import LocalHeliaProvider from './local-helia.js'

const PROVIDER_FACTORIES = {}

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
