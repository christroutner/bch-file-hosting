/*
  file-host command.

  Uploads a local file, pays the hosting quote from a named local wallet, then
  polls check-payment until the payment is confirmed. An already-hosted upload
  short-circuits without paying. Returns the process exit code: 0 success,
  1 runtime error, 2 usage error.
*/

// Local libraries
import FileUpload, { UsageError } from './file-upload.js'
import { attachWallet, validateWalletName } from '../lib/wallet-command.js'

class FileHost extends FileUpload {
  constructor (deps = {}) {
    super(deps)

    // Encapsulate wallet and polling dependencies so tests can replace them.
    attachWallet(this, deps)
    this.sleep = deps.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.paymentCheckAttempts = deps.paymentCheckAttempts ?? 10
    this.paymentCheckDelayMs = deps.paymentCheckDelayMs ?? 3000

    // Bind 'this' object to all subfunctions.
    this.pollPayment = this.pollPayment.bind(this)
  }

  validateFlags (flags = {}) {
    super.validateFlags(flags)

    return validateWalletName(flags.name)
  }

  async execute (flags = {}) {
    const filename = this.path.basename(flags.file)
    const buffer = this.readFile(flags.file)

    const quote = await this.hostingApi.upload({ filename, buffer })

    if (quote.alreadyHosted) {
      return { status: 'alreadyHosted', ...quote }
    }

    const wallet = this.walletStore.read(flags.name)
    if (!wallet) {
      throw new Error(`Wallet "${flags.name}" not found.`)
    }

    const txid = await this.walletService.sendSats({
      wallet,
      toAddress: quote.paymentAddress,
      amountSats: quote.priceSats
    })

    const paid = await this.pollPayment(quote.paymentAddress)

    return {
      status: 'paid',
      cid: paid.cid,
      downloadUrl: paid.downloadUrl,
      viewUrl: paid.viewUrl,
      gatewayUrls: paid.gatewayUrls || [],
      txid,
      paymentAddress: quote.paymentAddress
    }
  }

  // Poll the API until the payment is visible. Throws when it never confirms.
  async pollPayment (paymentAddress) {
    for (let attempt = 0; attempt < this.paymentCheckAttempts; attempt++) {
      const result = await this.hostingApi.checkPayment({ paymentAddress })
      if (result.status === 'paid') return result

      if (attempt < this.paymentCheckAttempts - 1) {
        await this.sleep(this.paymentCheckDelayMs)
      }
    }

    throw new Error('Payment not confirmed.')
  }

  report (result, flags) {
    if (flags.json) {
      this.output(JSON.stringify(result))
      return
    }

    if (result.status === 'alreadyHosted') {
      this.output(`Download URL: ${result.downloadUrl}`)
      this.output(`View URL: ${result.viewUrl}`)
      return
    }

    this.output(`CID: ${result.cid}`)
    this.output(`Download URL: ${result.downloadUrl}`)
    this.output(`View URL: ${result.viewUrl}`)
    for (const url of result.gatewayUrls || []) {
      this.output(`Gateway URL: ${url}`)
    }
    this.output(`Transaction: ${result.txid}`)
  }
}

export { UsageError }
export default FileHost

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T14:00:18.190Z","module_hash":"7ab2279fa0cffa06055612e1222dc450fd1280abc96b3f102e2b59aeddde82c8","functions":[{"id":"func/FileHost.constructor","name":"FileHost.constructor","line":15,"end_line":26,"hash":"93b32954a30172bacec9a99ac3dfc34ebc1338ba03be77c2d0e937ccfc1a2357"},{"id":"func/FileHost.validateFlags","name":"FileHost.validateFlags","line":28,"end_line":32,"hash":"2c9ee50ea6ade85737160c437f78e46fe5d54da2f5e6b8bfc58936b1b201c3a9"},{"id":"func/FileHost.execute","name":"FileHost.execute","line":34,"end_line":66,"hash":"30db893d280fb44f6d53eba3cf652ccc97e5bd2cd250f245d29705110169905b"},{"id":"func/FileHost.pollPayment","name":"FileHost.pollPayment","line":69,"end_line":80,"hash":"4dd181097828c4a455a95487578d5c0e9dd8696a0ec9cc44c169211f20cb5649"},{"id":"func/FileHost.report","name":"FileHost.report","line":82,"end_line":101,"hash":"22ca61e1d04a850c41a1b8bc8822ca47955f9d2db6e6f05e7550d6e4ab8fd33c"}]}
// mutate4javascript-manifest-end
