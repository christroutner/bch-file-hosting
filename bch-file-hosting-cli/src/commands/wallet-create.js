/*
  wallet-create command.

  Generates a new local wallet, stores it under the requested name, and prints
  its address. The mnemonic is written to the gitignored wallet store but is
  never printed. Returns the process exit code: 0 success, 1 runtime error,
  2 usage error.
*/

// Local libraries
import Command, { UsageError } from '../lib/command.js'
import WalletStore from '../lib/wallet-store.js'
import WalletService from '../lib/wallet-service.js'

class WalletCreate extends Command {
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
    if (!flags.name) {
      throw new UsageError('You must specify a wallet name with the -n flag.')
    }

    return true
  }

  async execute (flags = {}) {
    if (this.walletStore.has(flags.name)) {
      throw new Error(`A wallet named ${flags.name} already exists.`)
    }

    const wallet = await this.walletService.create()
    this.walletStore.write(flags.name, wallet)

    return wallet
  }

  report (wallet) {
    this.output(`Address: ${wallet.cashAddress}`)
  }
}

export { UsageError }
export default WalletCreate
