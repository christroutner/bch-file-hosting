/*
  Pinning provider for this service's own Helia node.
*/

import PinningProvider from './pinning-provider.js'

class LocalHeliaProvider extends PinningProvider {
  constructor ({ ipfs } = {}) {
    super()
    if (!ipfs) throw new Error('LocalHeliaProvider requires the IPFS adapter')
    this.ipfs = ipfs
  }

  get name () {
    return 'local-helia'
  }

  get capabilities () {
    return { pinByCid: true, uploadBytes: false, unpin: true }
  }

  async pin ({ cid }) {
    await this.ipfs.pin(cid)
    return { providerCid: cid, providerRef: null }
  }

  async status (cid) {
    return (await this.ipfs.isPinned(cid)) ? 'pinned' : 'unknown'
  }

  async unpin (cid) {
    await this.ipfs.unpin(cid)
  }
}

export default LocalHeliaProvider
