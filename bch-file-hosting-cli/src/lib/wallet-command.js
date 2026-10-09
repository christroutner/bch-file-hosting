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
// {"version":1,"tested_at":"2026-10-09T13:57:08.733Z","module_hash":"836fa50bb83421e2e4b85ebdaa604a409a2330ae5cf3cf40c949839c684b9e51","functions":[{"id":"func/attachWallet","name":"attachWallet","line":15,"end_line":18,"hash":"700797b769341c93ac75f7786fcd3a5c760bc569fc8ca02ce6fe4226e396fa67"},{"id":"func/validateWalletName","name":"validateWalletName","line":21,"end_line":33,"hash":"45eadde06b3b2f4f28bb3fa067e1e56330d8fd0381021b103250c7867772e273"},{"id":"func/WalletCommand.constructor","name":"WalletCommand.constructor","line":36,"end_line":46,"hash":"d40cfbd43fe16844d398c5f0ea3b5dcbc6c54721c76a25369e908ace595cd4bc"},{"id":"func/WalletCommand.validateFlags","name":"WalletCommand.validateFlags","line":48,"end_line":50,"hash":"4b83ff89d8701e07726f947034e6c07c186b79622d2d9ac6e0930b04508d9172"}]}
// mutate4javascript-manifest-end
