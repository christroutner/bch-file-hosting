/*
  file-pay command.

  Looks up an invoice through the hosting API and, when it is unpaid, sends the
  outstanding satoshis from a named local wallet. Already-paid invoices are a
  no-op success. Returns the process exit code: 0 success, 1 runtime error,
  2 usage error.
*/

// Local libraries
import FileCommand, { UsageError } from '../lib/file-command.js'
import WalletStore, { isValidWalletName } from '../lib/wallet-store.js'
import WalletService from '../lib/wallet-service.js'

const MISSING_WALLET_MESSAGE = 'You must specify a wallet name with the -n flag.'

class FilePay extends FileCommand {
  constructor (deps = {}) {
    super(deps)

    // Encapsulate wallet dependencies so tests can replace them.
    this.walletStore = deps.walletStore || new WalletStore()
    this.walletService = deps.walletService || new WalletService({ config: this.config })

    // Bind 'this' object to all subfunctions.
    this.validateFlags = this.validateFlags.bind(this)
    this.execute = this.execute.bind(this)
    this.report = this.report.bind(this)
  }

  validateFlags (flags = {}) {
    if (!flags.address) {
      throw new UsageError('You must specify a payment address with the -a flag.')
    }

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
    const invoice = await this.hostingApi.checkPayment({ paymentAddress: flags.address })

    if (invoice.status === 'paid') {
      return { status: 'paid' }
    }

    if (invoice.status === 'expired') {
      throw new Error('Invoice expired.')
    }

    const wallet = this.walletStore.read(flags.name)
    if (!wallet) {
      throw new Error(`Wallet "${flags.name}" not found.`)
    }

    const amountSats = invoice.requiredSats - invoice.receivedSats
    const txid = await this.walletService.sendSats({
      wallet,
      toAddress: flags.address,
      amountSats
    })

    return { status: 'sent', amountSats, txid, paymentAddress: flags.address }
  }

  report (result, flags) {
    if (flags.json) {
      this.output(JSON.stringify(result))
      return
    }

    if (result.status === 'paid') {
      this.output('Already paid')
      return
    }

    this.output(`Amount: ${result.amountSats} satoshis`)
    this.output(`Transaction: ${result.txid}`)
  }
}

export { UsageError }
export default FilePay
