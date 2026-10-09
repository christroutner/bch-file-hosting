/*
  Shared setup for wallet subcommands.

  Wallet commands all take a `-n <name>` wallet name and use the local wallet
  store and minimal-slp-wallet service. Dependencies are injected so unit tests
  never read disk state or touch the network.
*/

// Local libraries
import Command, { UsageError } from './command.js'
import WalletStore, { isValidWalletName } from './wallet-store.js'
import WalletService from './wallet-service.js'

// Attach the default wallet store and service to a command unless injected.
function attachWallet (command, deps = {}) {
  command.walletStore = deps.walletStore || new WalletStore()
  command.walletService = deps.walletService || new WalletService({ config: command.config })
}

// Throw the shared usage error for a missing or unsafe wallet name.
function validateWalletName (name) {
  if (!name) {
    throw new UsageError('You must specify a wallet name with the -n flag.')
  }

  if (!isValidWalletName(name)) {
    throw new UsageError(
      `Invalid wallet name "${name}". Use only letters, digits, hyphens, and underscores.`
    )
  }

  return true
}

class WalletCommand extends Command {
  constructor (deps = {}) {
    super(deps)

    // Encapsulate wallet dependencies so tests can replace them.
    attachWallet(this, deps)

    // Bind 'this' object to all subfunctions.
    this.validateFlags = this.validateFlags.bind(this)
    this.execute = this.execute.bind(this)
    this.report = this.report.bind(this)
  }

  validateFlags (flags = {}) {
    return validateWalletName(flags.name)
  }
}

export { UsageError, attachWallet, validateWalletName }
export default WalletCommand

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T13:22:03.915Z","module_hash":"1f78842cfce122a7890a65806dcc905c5e6b6b085940da33542b645d2c8af319","functions":[{"id":"func/WalletCommand.constructor","name":"WalletCommand.constructor","line":15,"end_line":26,"hash":"e5636c6f2b850a3330130b261d8f03a5903735f971c15418bf141526c7d114fb"},{"id":"func/WalletCommand.validateFlags","name":"WalletCommand.validateFlags","line":28,"end_line":40,"hash":"878276df80b56d80a2eeffce3bd6bf0d4e3a8c42bb642e1c61566d73b3ff5c8a"}]}
// mutate4javascript-manifest-end
