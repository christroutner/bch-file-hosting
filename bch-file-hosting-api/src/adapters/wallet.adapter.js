/*
  Wallet adapter. Wraps minimal-slp-wallet for the server HD wallet: invoice
  key derivation, balance checks, sweeping, and the BCH/USD price.

  All amounts are integer satoshis. Invoice private keys (WIFs) are derived on
  demand from the mnemonic and are never persisted.
*/

import BchWallet from 'minimal-slp-wallet'

const INTERFACES = {
  web3: 'consumer-api',
  web2: 'rest-api',
  x402: 'rest-api'
}

class WalletAdapter {
  constructor ({ config } = {}) {
    if (!config) throw new Error('WalletAdapter requires a config object')
    this.config = config

    // Encapsulated for unit tests.
    this.BchWallet = BchWallet

    this.bchWallet = null

    this.init = this.init.bind(this)
    this.getKeyPair = this.getKeyPair.bind(this)
    this.getBalanceSats = this.getBalanceSats.bind(this)
    this.sweep = this.sweep.bind(this)
    this.getUsdPerBch = this.getUsdPerBch.bind(this)
  }

  getWalletOptions () {
    const { walletInterface, apiServer, walletWifX402 } = this.config

    const iface = INTERFACES[walletInterface]
    if (!iface) {
      throw new Error(
        `Unknown WALLET_INTERFACE '${walletInterface}'. Use one of: ${Object.keys(INTERFACES).join(', ')}`
      )
    }

    const options = { interface: iface, restURL: apiServer }
    if (walletInterface === 'x402') {
      if (!walletWifX402) throw new Error('WALLET_WIF_X402 is required when WALLET_INTERFACE=x402')
      options.wif = walletWifX402
    }

    return options
  }

  async init () {
    if (!this.config.mnemonic) throw new Error('MNEMONIC is required to open the server wallet')
    if (!this.config.treasuryAddress) throw new Error('TREASURY_ADDRESS is required')

    this.bchWallet = await this.createWallet(this.config.mnemonic)
    return true
  }

  async createWallet (mnemonicOrWif) {
    const wallet = new this.BchWallet(mnemonicOrWif, this.getWalletOptions())
    await wallet.walletInfoPromise
    return wallet
  }

  assertInitialized () {
    if (!this.bchWallet) throw new Error('Wallet adapter has not been initialized')
  }

  // Derive the key pair for an invoice. Index 0 is the server wallet itself.
  async getKeyPair (hdIndex) {
    this.assertInitialized()
    if (!Number.isInteger(hdIndex) || hdIndex < 1) {
      throw new Error('hdIndex must be an integer of at least 1')
    }

    const keyPair = await this.bchWallet.getKeyPair(hdIndex)
    return { cashAddress: keyPair.cashAddress, wif: keyPair.wif, hdIndex }
  }

  // Confirmed + unconfirmed balance in satoshis, so 0-conf payments count.
  async getBalanceSats (address) {
    this.assertInitialized()

    const balance = await this.bchWallet.getBalance({ bchAddress: address })
    if (!Number.isInteger(balance) || balance < 0) {
      throw new Error(`Unexpected balance from wallet backend: ${balance}`)
    }
    return balance
  }

  // Send everything at an invoice address to the treasury. Returns the txid.
  async sweep (hdIndex) {
    const { wif } = await this.getKeyPair(hdIndex)

    const invoiceWallet = await this.createWallet(wif)
    await invoiceWallet.initialize()

    return invoiceWallet.sendAll(this.config.treasuryAddress)
  }

  async getUsdPerBch () {
    this.assertInitialized()

    const usdPerBch = await this.bchWallet.getUsd()
    if (typeof usdPerBch !== 'number' || !Number.isFinite(usdPerBch) || usdPerBch <= 0) {
      throw new Error(`Unexpected BCH price from wallet backend: ${usdPerBch}`)
    }
    return usdPerBch
  }
}

export default WalletAdapter
