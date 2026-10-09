/*
  file-host command.

  Uploads a local file, pays the hosting quote from a named local wallet, then
  polls check-payment until the payment is confirmed. An already-hosted upload
  short-circuits without paying. Returns the process exit code: 0 success,
  1 runtime error, 2 usage error.
*/

// Local libraries
import FileUpload, { UsageError } from './file-upload.js'
import WalletStore, { isValidWalletName } from '../lib/wallet-store.js'
import WalletService from '../lib/wallet-service.js'

const MISSING_WALLET_MESSAGE = 'You must specify a wallet name with the -n flag.'

class FileHost extends FileUpload {
  constructor (deps = {}) {
    super(deps)

    // Encapsulate wallet and polling dependencies so tests can replace them.
    this.walletStore = deps.walletStore || new WalletStore()
    this.walletService = deps.walletService || new WalletService({ config: this.config })
    this.sleep = deps.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.paymentCheckAttempts = deps.paymentCheckAttempts ?? 10
    this.paymentCheckDelayMs = deps.paymentCheckDelayMs ?? 3000

    // Bind 'this' object to all subfunctions.
    this.pollPayment = this.pollPayment.bind(this)
  }

  validateFlags (flags = {}) {
    super.validateFlags(flags)

    if (!flags.name) {
      throw new UsageError(MISSING_WALLET_MESSAGE)
    }

    if (!isValidWalletName(flags.name)) {
      throw new UsageError(
        `Invalid wallet name "${flags.name}". Use only letters, digits, hyphens, and underscores.`
      )
    }

    return true
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
      return
    }

    this.output(`CID: ${result.cid}`)
    this.output(`Download URL: ${result.downloadUrl}`)
    for (const url of result.gatewayUrls || []) {
      this.output(`Gateway URL: ${url}`)
    }
  }
}

export { UsageError }
export default FileHost
