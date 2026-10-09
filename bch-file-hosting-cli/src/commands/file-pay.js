/*
  file-pay command.

  Looks up an invoice through the hosting API and, when it is unpaid, sends the
  outstanding satoshis from a named local wallet. Already-paid invoices are a
  no-op success. Returns the process exit code: 0 success, 1 runtime error,
  2 usage error.
*/

// Local libraries
import WalletCommand, { UsageError } from '../lib/wallet-command.js'
import HostingApi from '../lib/hosting-api.js'

class FilePay extends WalletCommand {
  constructor (deps = {}) {
    super(deps)

    // WalletCommand supplies the wallet name check, store, and service; this
    // command also needs the hosting API.
    this.hostingApi = deps.hostingApi || new HostingApi({ config: this.config })
  }

  validateFlags (flags = {}) {
    if (!flags.address) {
      throw new UsageError('You must specify a payment address with the -a flag.')
    }

    return super.validateFlags(flags)
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
