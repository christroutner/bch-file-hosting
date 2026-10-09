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
    return { pinByCid: true, uploadBytes: false, unpin: true, authoritative: false }
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T19:04:43.890Z","module_hash":"79dff4b664d4c6e8f08b64fd2a2c1a5dbe2a257c4f30254c47d0f2cfe258532b","functions":[{"id":"func/LocalHeliaProvider.constructor","name":"LocalHeliaProvider.constructor","line":8,"end_line":12,"hash":"7a2106a0aab466d71f217e5bd4c83a5c7f021c8085404563f401012acc1ed4ad"},{"id":"func/LocalHeliaProvider.name","name":"LocalHeliaProvider.name","line":14,"end_line":16,"hash":"31fea94e60fa68fd381067de7c85835633b424623e4346e3678e0827f3c1746a"},{"id":"func/LocalHeliaProvider.capabilities","name":"LocalHeliaProvider.capabilities","line":18,"end_line":20,"hash":"c45dd87f50284e11cc7793950b891379888a8632036f671acac9c62bdae0ce50"},{"id":"func/LocalHeliaProvider.pin","name":"LocalHeliaProvider.pin","line":22,"end_line":25,"hash":"cdd465fc5a3e044ff343cb1f6f9fcfce1631ba09db381b8e712647cc98c97161"},{"id":"func/LocalHeliaProvider.status","name":"LocalHeliaProvider.status","line":27,"end_line":29,"hash":"ca40893a495e146560c4122b7e2e534e922099d1c5b1116573829d79fcff8b35"},{"id":"func/LocalHeliaProvider.unpin","name":"LocalHeliaProvider.unpin","line":31,"end_line":33,"hash":"7a808bd45a5eccfe50c0a32d85570eff1bf36e514c1a88156e85630cfd0d02f2"}]}
// mutate4javascript-manifest-end
