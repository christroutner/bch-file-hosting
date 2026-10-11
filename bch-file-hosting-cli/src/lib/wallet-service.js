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
    this.walletSecret = this.walletSecret.bind(this)
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

  // The constructor secret for a wallet source: a stored mnemonic or an inline
  // WIF. A WIF source carries no HD derivation path.
  walletSecret (walletData = {}) {
    if (walletData.wif) return { secret: walletData.wif, hdPath: undefined }
    return { secret: walletData.mnemonic, hdPath: walletData.hdPath }
  }

  // Confirmed + unconfirmed satoshi balance for a stored wallet or WIF source.
  async balanceSats (walletData) {
    const { secret, hdPath } = this.walletSecret(walletData)
    const wallet = new this.BchWallet(secret, this.walletOptions({ hdPath }))
    await wallet.walletInfoPromise

    const address = walletData.cashAddress || wallet.walletInfo.cashAddress
    const balance = await wallet.getBalance({ bchAddress: address })
    if (!Number.isInteger(balance) || balance < 0) {
      throw new Error(`Unexpected balance from wallet backend: ${balance}`)
    }

    return balance
  }

  // Send BCH from a stored wallet to a payment address. Returns the txid.
  //
  // minimal-slp-wallet's send() always adds a 2,000-sat PSF donation output
  // (lib/send-bch.js), so the payer is debited amountSats plus that donation
  // plus the miner fee. The server sweep avoids the same donation by building
  // its own transaction; whether the CLI should do likewise is a follow-up.
  async sendSats ({ wallet, toAddress, amountSats } = {}) {
    if (!Number.isInteger(amountSats) || amountSats <= 0) {
      throw new Error(`amountSats must be a positive integer, got: ${amountSats}`)
    }

    const { secret, hdPath } = this.walletSecret(wallet)
    const bchWallet = new this.BchWallet(secret, this.walletOptions({ hdPath }))
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
// {"version":1,"tested_at":"2026-10-11T15:45:30.747Z","module_hash":"1da819334d4d75234838d3fc909a66f84cda9f5d25debe9cfc62d129b4c86be8","functions":[{"id":"func/WalletService.constructor","name":"WalletService.constructor","line":13,"end_line":22,"hash":"e44581c10d2810f1d6a4ca146e3d6a9f84c64b6b14e9a8c47c7ee7dd6ee6a57b"},{"id":"func/WalletService.walletOptions","name":"WalletService.walletOptions","line":24,"end_line":30,"hash":"5eb30cee706318885ce98fed260b203a03ca375c3bcbbb61a74093caf1685671"},{"id":"func/WalletService.create","name":"WalletService.create","line":33,"end_line":37,"hash":"3c4d5b7a458223d4a8cc3afc01ccc20fd232d1eeaf2a9a5560265fcce29f905d"},{"id":"func/WalletService.walletSecret","name":"WalletService.walletSecret","line":41,"end_line":44,"hash":"4499f73c8ba1e4eb8b6079658953a6b69c587e637f2b37272257734660d23d85"},{"id":"func/WalletService.balanceSats","name":"WalletService.balanceSats","line":47,"end_line":59,"hash":"2877011d6e4a567332c72b17c61fda78805a6cd73d0b103c8422749c6e8887ef"},{"id":"func/WalletService.sendSats","name":"WalletService.sendSats","line":67,"end_line":83,"hash":"6bf4851016df2f9f249288bb767bbdaa730d0d91522746638187a80021370469"}]}
// mutate4javascript-manifest-end
