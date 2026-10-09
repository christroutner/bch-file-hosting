/*
  Placeholder for a future on-chain announcement of each paid file (an
  OP_RETURN transaction). The payload format is not decided yet, so this
  implementation announces nothing.
*/

class NoopAnnouncer {
  async announce ({ cid, filename, sizeBytes, paymentAddress } = {}) {
    return { announced: false, txid: null }
  }
}

export default NoopAnnouncer
