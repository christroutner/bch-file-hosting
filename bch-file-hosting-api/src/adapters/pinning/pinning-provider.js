/*
  Base class for pinning providers (the local Helia node and third-party
  services such as Lighthouse). Use-cases depend only on this contract, so a
  provider can be added or swapped by writing one subclass and naming it in
  PINNING_PROVIDERS.

  capabilities:
    pinByCid    - the provider fetches content from the IPFS network by CID
    uploadBytes - the provider receives the file bytes from us
    unpin       - the provider can remove a pin
*/

class PinningProvider {
  get name () {
    throw new Error('PinningProvider subclasses must implement name')
  }

  get capabilities () {
    throw new Error('PinningProvider subclasses must implement capabilities')
  }

  // Returns { providerCid, providerRef }.
  async pin ({ cid, filePath, filename, sizeBytes }) {
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
  gatewayUrl (cid) {
    return null
  }
}

export default PinningProvider
