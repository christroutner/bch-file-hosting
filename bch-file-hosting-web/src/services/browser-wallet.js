/*
  Browser wallet adapter.

  Wraps a loaded minimal-slp-wallet instance and exposes the small surface the
  hosting page needs: send satoshis to an address and get the transaction id.
  The wallet is injected so the page service never depends on the wallet
  library directly and tests can use a fake.
*/

'use strict'

class BrowserWallet {
  constructor ({ wallet } = {}) {
    if (!wallet) throw new Error('BrowserWallet requires a wallet')

    this.wallet = wallet

    this.send = this.send.bind(this)
  }

  // Send satoshis to an address. minimal-slp-wallet's send() also adds the
  // 2,000-sat PSF donation output, consistent with the CLI.
  async send ({ address, amountSats } = {}) {
    return this.wallet.send([{ address, amountSat: amountSats }])
  }
}

module.exports = BrowserWallet

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T15:19:43.838Z","module_hash":"08c719636ba0dab835897ba37cc34c3834e72728cde03a879a3a0c14bcfbe3a6","functions":[{"id":"func/BrowserWallet.constructor","name":"BrowserWallet.constructor","line":13,"end_line":19,"hash":"8444c09b17ceeb8cb837cbcfe3f43da69a368a79c288f3253c8ca4279adbe44f"},{"id":"func/BrowserWallet.send","name":"BrowserWallet.send","line":23,"end_line":25,"hash":"719709231e48418d0a08504537443ec84f366246199f6b4200d446d5eb4e2a46"}]}
// mutate4javascript-manifest-end
