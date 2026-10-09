/*
  Wallet service.

  Small wrapper around minimal-slp-wallet: generate a wallet (mnemonic and
  address) and read an integer satoshi balance. The wallet library is injected
  so unit tests never touch the network.
*/

// Global npm libraries
import BchWallet from 'minimal-slp-wallet'

class WalletService {
  constructor ({ config, BchWallet: WalletClass = BchWallet } = {}) {
    this.config = config
    this.BchWallet = WalletClass

    this.walletOptions = this.walletOptions.bind(this)
    this.create = this.create.bind(this)
    this.balanceSats = this.balanceSats.bind(this)
    this.sendSats = this.sendSats.bind(this)
  }

  walletOptions (extra = {}) {
    return {
      interface: this.config.walletInterface,
      restURL: this.config.walletUrl,
      ...extra
    }
  }

  // Generate a new wallet and return its walletInfo (includes the mnemonic).
  async create () {
    const wallet = new this.BchWallet(undefined, this.walletOptions())
    await wallet.walletInfoPromise
    return wallet.walletInfo
  }

  // Confirmed + unconfirmed satoshi balance for a stored wallet.
  async balanceSats (walletData) {
    const wallet = new this.BchWallet(
      walletData.mnemonic,
      this.walletOptions({ hdPath: walletData.hdPath })
    )
    await wallet.walletInfoPromise

    const balance = await wallet.getBalance({ bchAddress: walletData.cashAddress })
    if (!Number.isInteger(balance) || balance < 0) {
      throw new Error(`Unexpected balance from wallet backend: ${balance}`)
    }

    return balance
  }

  // Send BCH from a stored wallet to a payment address. Returns the txid.
  async sendSats ({ wallet, toAddress, amountSats } = {}) {
    if (!Number.isInteger(amountSats) || amountSats <= 0) {
      throw new Error(`amountSats must be a positive integer, got: ${amountSats}`)
    }

    const bchWallet = new this.BchWallet(
      wallet.mnemonic,
      this.walletOptions({ hdPath: wallet.hdPath })
    )
    await bchWallet.walletInfoPromise
    await bchWallet.initialize()

    const txid = await bchWallet.send([{ address: toAddress, amountSat: amountSats }])
    if (typeof txid !== 'string' || !txid) {
      throw new Error(`Unexpected transaction id from wallet backend: ${txid}`)
    }

    return txid
  }
}

export default WalletService

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T04:09:14.070Z","module_hash":"52e2b1547d2815d28e174312a384595997b1923c88a819c131933b898a77953e","functions":[{"id":"func/WalletService.constructor","name":"WalletService.constructor","line":13,"end_line":20,"hash":"b0f009581594beb8440880a7fefa2b773f05f9651033aa3317559326eedaf5b1"},{"id":"func/WalletService.walletOptions","name":"WalletService.walletOptions","line":22,"end_line":28,"hash":"5eb30cee706318885ce98fed260b203a03ca375c3bcbbb61a74093caf1685671"},{"id":"func/WalletService.create","name":"WalletService.create","line":31,"end_line":35,"hash":"3c4d5b7a458223d4a8cc3afc01ccc20fd232d1eeaf2a9a5560265fcce29f905d"},{"id":"func/WalletService.balanceSats","name":"WalletService.balanceSats","line":38,"end_line":51,"hash":"f0c390329b593db9ba0d8486fa9ef4940bda525646d939a53804769f2e009a37"}]}
// mutate4javascript-manifest-end
