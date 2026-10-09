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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:21:16.671Z","module_hash":"c422f5ef4c5746711716f4cfd39f7ddfbcef35633f3d96e455f0391ca46f2369","functions":[{"id":"func/NoopAnnouncer.announce","name":"NoopAnnouncer.announce","line":8,"end_line":10,"hash":"267911c6ca0063dd0c767cfe34788cba671c3f58c00c7fc4f6b5dd8abeebe5f1"}]}
// mutate4javascript-manifest-end
