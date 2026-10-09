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
