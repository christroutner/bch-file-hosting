/*
  Wallet adapter. Wraps minimal-slp-wallet for the server HD wallet: invoice
  key derivation, balance checks, sweeping, and the BCH/USD price.

  All amounts are integer satoshis. Invoice private keys (WIFs) are derived on
  demand from the mnemonic and are never persisted.
*/

import BchWallet from 'minimal-slp-wallet'

const SWEEP_SATS_PER_BYTE = 1.2
const DUST_LIMIT_SATS = 546

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

    try {
      this.bchWallet.bchjs.Address.toCashAddress(this.config.treasuryAddress)
    } catch (err) {
      throw new Error(`TREASURY_ADDRESS is not a valid BCH address: ${this.config.treasuryAddress}`)
    }
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

  // Send every BCH UTXO at an invoice address to the treasury in one output,
  // minus only the miner fee. Returns the txid.
  //
  // minimal-slp-wallet's sendAll() is not used because it always adds a
  // 2000 sat donation output, which consumes an entire minimum invoice.
  async sweep (hdIndex) {
    const { wif } = await this.getKeyPair(hdIndex)

    const invoiceWallet = await this.createWallet(wif)
    await invoiceWallet.initialize()

    const utxos = invoiceWallet.utxos.utxoStore.bchUtxos || []
    if (!utxos.length) throw new Error('No BCH UTXOs to sweep')

    const { bchjs } = invoiceWallet
    const txb = new bchjs.TransactionBuilder()

    let totalSats = 0
    for (const utxo of utxos) {
      txb.addInput(utxo.tx_hash, utxo.tx_pos)
      totalSats += utxo.value
    }

    const byteCount = bchjs.BitcoinCash.getByteCount({ P2PKH: utxos.length }, { P2PKH: 1 })
    const feeSats = Math.ceil(byteCount * SWEEP_SATS_PER_BYTE)
    const sweepSats = totalSats - feeSats
    if (sweepSats < DUST_LIMIT_SATS) {
      throw new Error(`Balance of ${totalSats} sats is too small to sweep after a ${feeSats} sat fee`)
    }

    txb.addOutput(this.config.treasuryAddress, sweepSats)

    const keyPair = bchjs.ECPair.fromWIF(wif)
    utxos.forEach((utxo, i) => {
      txb.sign(i, keyPair, undefined, txb.hashTypes.SIGHASH_ALL, utxo.value)
    })

    return invoiceWallet.broadcast({ hex: txb.build().toHex() })
  }

  async getUsdPerBch () {
    this.assertInitialized()

    const usdPerBch = await this.bchWallet.getUsd()
    // Number.isFinite() already rejects non-numbers, so no typeof check is needed.
    if (!Number.isFinite(usdPerBch) || usdPerBch <= 0) {
      throw new Error(`Unexpected BCH price from wallet backend: ${usdPerBch}`)
    }
    return usdPerBch
  }
}

export default WalletAdapter

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:26:41.681Z","module_hash":"d600badfe82460aec07412961f65b82d989e9cbda7cf0dad8f07c463050d0cba","functions":[{"id":"func/WalletAdapter.constructor","name":"WalletAdapter.constructor","line":21,"end_line":35,"hash":"87f455cffb26dfbaab695b040a9717a5a4373ea40b312a82d01f65f1508b3cd2"},{"id":"func/WalletAdapter.getWalletOptions","name":"WalletAdapter.getWalletOptions","line":37,"end_line":54,"hash":"167a9f105c15728f38698be772cef7e64ffdff26b6680721de984caf21a8d283"},{"id":"func/WalletAdapter.init","name":"WalletAdapter.init","line":56,"end_line":68,"hash":"6cadddda074b362ecaa5565e27c236e671e52a6ceec15c4795f32700327558e1"},{"id":"func/WalletAdapter.createWallet","name":"WalletAdapter.createWallet","line":70,"end_line":74,"hash":"f44250368fe1a40fe27ede9c460357473f4c789ce6966bb408d550056861b29c"},{"id":"func/WalletAdapter.assertInitialized","name":"WalletAdapter.assertInitialized","line":76,"end_line":78,"hash":"82b5e80ab6797d73258178fd18a04e834464d8732a873b1297425ec40dffeb11"},{"id":"func/WalletAdapter.getKeyPair","name":"WalletAdapter.getKeyPair","line":81,"end_line":89,"hash":"e32abaa868df39e54f704b39f0f5b3e45db23cea6456a264b2d3107da2c6248f"},{"id":"func/WalletAdapter.getBalanceSats","name":"WalletAdapter.getBalanceSats","line":92,"end_line":100,"hash":"b880eb7946e5904bf3b22acbf3cd6a4a89c0635771d0232014898d9ef253d331"},{"id":"func/WalletAdapter.sweep","name":"WalletAdapter.sweep","line":107,"end_line":140,"hash":"1e68d29630d3941028b161f6083bd3f0d13e24487e610632a011eca0247c23bf"},{"id":"func/WalletAdapter.getUsdPerBch","name":"WalletAdapter.getUsdPerBch","line":142,"end_line":151,"hash":"37edfc2bcad033b78bc5c419f69dedbef9e65ca00b010b99ab4e767c9f11abaa"}]}
// mutate4javascript-manifest-end
