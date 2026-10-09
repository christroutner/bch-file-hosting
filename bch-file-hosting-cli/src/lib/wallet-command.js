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

// Wallet names become `<name>.json` files in the local store, so restrict them
// to characters that cannot escape the store directory.
const WALLET_NAME_PATTERN = /^[A-Za-z0-9_-]+$/

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

    if (!WALLET_NAME_PATTERN.test(flags.name)) {
      throw new UsageError(
        `Invalid wallet name "${flags.name}". Use only letters, digits, hyphens, and underscores.`
      )
    }

    return true
  }
}

export { UsageError }
export default WalletCommand

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T04:07:58.640Z","module_hash":"e295ef80baabc83a279ee1d29e6ab29f241a8168ce452c5898c1f48c6f58ee27","functions":[{"id":"func/WalletCommand.constructor","name":"WalletCommand.constructor","line":15,"end_line":26,"hash":"e5636c6f2b850a3330130b261d8f03a5903735f971c15418bf141526c7d114fb"},{"id":"func/WalletCommand.validateFlags","name":"WalletCommand.validateFlags","line":28,"end_line":34,"hash":"312ce7dcf089364d39e40fc34f38448c8851bf69731cae9513bb9ca2d7654947"}]}
// mutate4javascript-manifest-end
