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
}

export default WalletService
