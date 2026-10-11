/*
  file-host command.

  Uploads a local file, pays the hosting quote from a named local wallet, then
  polls check-payment until the payment is confirmed. An already-hosted upload
  short-circuits without paying. Returns the process exit code: 0 success,
  1 runtime error, 2 usage error.
*/

// Local libraries
import FileUpload, { UsageError } from './file-upload.js'
import { attachWallet, validateWalletSource, resolveWalletSource } from '../lib/wallet-command.js'

class FileHost extends FileUpload {
  constructor (deps = {}) {
    super(deps)

    // Encapsulate wallet and polling dependencies so tests can replace them.
    attachWallet(this, deps)
    this.sleep = deps.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.paymentCheckAttempts = deps.paymentCheckAttempts ?? 10
    this.paymentCheckDelayMs = deps.paymentCheckDelayMs ?? 3000

    // Bind 'this' object to all subfunctions.
    this.resolveWallet = this.resolveWallet.bind(this)
    this.pollPayment = this.pollPayment.bind(this)
  }

  resolveWallet (flags = {}) {
    return resolveWalletSource(this.walletStore, flags)
  }

  validateFlags (flags = {}) {
    super.validateFlags(flags)

    return validateWalletSource(flags)
  }

  async execute (flags = {}) {
    const filename = this.path.basename(flags.file)
    const buffer = this.readFile(flags.file)

    const quote = await this.hostingApi.upload({ filename, buffer })

    if (quote.alreadyHosted) {
      return { status: 'alreadyHosted', ...quote }
    }

    const wallet = this.resolveWallet(flags)

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
// {"version":1,"tested_at":"2026-10-11T15:44:52.193Z","module_hash":"e234054d00db3deeff5ed5f9f70a5b04733b0453d5a5ecac8ca372d5e1fcc345","functions":[{"id":"func/FileHost.constructor","name":"FileHost.constructor","line":15,"end_line":27,"hash":"96794b205cc0bca3a7141d710b01a2865af792352d5ae1faddcde049280aeae6"},{"id":"func/FileHost.resolveWallet","name":"FileHost.resolveWallet","line":29,"end_line":31,"hash":"88b24d39da829b644a70d4445ab71be3831260d8903ec1e6db56be50fecac45f"},{"id":"func/FileHost.validateFlags","name":"FileHost.validateFlags","line":33,"end_line":37,"hash":"88dad9056f3a705d922cd9a15facd020950fb61dba49bf0b09d55dffac3cadc3"},{"id":"func/FileHost.execute","name":"FileHost.execute","line":39,"end_line":68,"hash":"c728e8cef22ed77e8cf7d642232cf75426e19831afb72442fd88cafe66527225"},{"id":"func/FileHost.pollPayment","name":"FileHost.pollPayment","line":71,"end_line":82,"hash":"4dd181097828c4a455a95487578d5c0e9dd8696a0ec9cc44c169211f20cb5649"},{"id":"func/FileHost.report","name":"FileHost.report","line":84,"end_line":103,"hash":"22ca61e1d04a850c41a1b8bc8822ca47955f9d2db6e6f05e7550d6e4ab8fd33c"}]}
// mutate4javascript-manifest-end
