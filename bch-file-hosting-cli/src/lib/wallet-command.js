/*
  Shared setup for wallet subcommands.

  Wallet commands all take a `-n <name>` wallet name and use the local wallet
  store and minimal-slp-wallet service. Dependencies are injected so unit tests
  never read disk state or touch the network.
*/

// Local libraries
import Command, { UsageError } from './command.js'
import WalletStore from './wallet-store.js'
import WalletService from './wallet-service.js'

class WalletCommand extends Command {
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
}

export { UsageError }
export default WalletCommand
