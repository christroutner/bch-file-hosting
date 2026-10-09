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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T13:45:06.086Z","module_hash":"fc72b71ea522636502a42ec4bc2b2a959ae0a4e70d6628c671e9f59f99c2cbbd","functions":[{"id":"func/FilePay.constructor","name":"FilePay.constructor","line":15,"end_line":21,"hash":"341f04d6b6f5a644afc799b29930a36c8efc618853bc2ed0ec184c513adb1a95"},{"id":"func/FilePay.validateFlags","name":"FilePay.validateFlags","line":23,"end_line":29,"hash":"7f2bf3cc3d6b5ca0475d47e73bd96af30df63590dd8a6d1c5902805cc40a1f61"},{"id":"func/FilePay.execute","name":"FilePay.execute","line":31,"end_line":55,"hash":"6a5b46e2172a90b20c34e38307815e4de1a7c266057215bf0de07ad8da0291b9"},{"id":"func/FilePay.report","name":"FilePay.report","line":57,"end_line":70,"hash":"b4066582765ea72766de243a3a3fe3d65d3522891cd971a363dedfd85315e708"}]}
// mutate4javascript-manifest-end
