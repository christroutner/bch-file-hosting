/*
  Base class for pinning providers (the local Helia node and third-party
  services such as Lighthouse). Use-cases depend only on this contract, so a
  provider can be added or swapped by writing one subclass and naming it in
  PINNING_PROVIDERS.

  capabilities:
    pinByCid      - the provider fetches content from the IPFS network by CID
    uploadBytes   - the provider receives the file bytes from us, as the
                    `content` argument to pin()
    unpin         - the provider can remove a pin
    authoritative - the provider's pin is the file's success criterion. A file
                    is `pinned` when every authoritative provider succeeded;
                    non-authoritative (best-effort) providers are still
                    recorded but their failures do not fail the file.
*/

class PinningProvider {
  get name () {
    throw new Error('PinningProvider subclasses must implement name')
  }

  get capabilities () {
    throw new Error('PinningProvider subclasses must implement capabilities')
  }

  // Returns { providerCid, providerRef }. For an uploadBytes provider the
  // caller supplies `content`, a stream or iterable of the file bytes.
  async pin ({ cid, filePath, filename, sizeBytes, content }) {
    throw new Error(`${this.name} does not implement pin()`)
  }

  // Returns 'pinned' | 'pinning' | 'failed' | 'unknown'.
  async status (cid) {
    throw new Error(`${this.name} does not implement status()`)
  }

  async unpin (cid) {
    throw new Error(`${this.name} does not implement unpin()`)
  }

  // Returns a public URL for the content, or null if the provider has none.
  // CIDs are wrapping directories, so a provider that serves the file itself
  // should use the filename.
  gatewayUrl (cid, filename) {
    return null
  }
}

export default PinningProvider

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T19:04:38.680Z","module_hash":"ad08f41b38d1a946323d2bc4b603f428ef682f8a0077ac71dd78885dc4828fe5","functions":[{"id":"func/PinningProvider.name","name":"PinningProvider.name","line":19,"end_line":21,"hash":"bc06d64253011a614918f695fdde3daaf47e16a8d85879b4ab9144bd1afe3135"},{"id":"func/PinningProvider.capabilities","name":"PinningProvider.capabilities","line":23,"end_line":25,"hash":"c6c335d2b8957ac3657d44c32373158fe2eaf73a753f8103374cadef5184c836"},{"id":"func/PinningProvider.pin","name":"PinningProvider.pin","line":29,"end_line":31,"hash":"26df7103891e6c55eafc0f6557cc6e8a7bfb0848295703effa9edd266283659a"},{"id":"func/PinningProvider.status","name":"PinningProvider.status","line":34,"end_line":36,"hash":"ca2c2ad1e35b8f58dd1e61b209c682b03a5eace3821dd065d4632f998fd3b586"},{"id":"func/PinningProvider.unpin","name":"PinningProvider.unpin","line":38,"end_line":40,"hash":"bec2668930fadaa42197d369affd737032cdabe84d8bbbbf99837759f1e4e6ae"},{"id":"func/PinningProvider.gatewayUrl","name":"PinningProvider.gatewayUrl","line":45,"end_line":47,"hash":"0b35cffc84feea72aa7dfb6dcaa71f45bc2cdfb8bfad63531aaa7d1460a1fc07"}]}
// mutate4javascript-manifest-end
