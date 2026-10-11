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

// The user-facing usage errors for a missing or conflicting wallet source.
const WALLET_SOURCE_MESSAGE = 'You must specify a wallet name with the -n flag or a WIF with the --wif flag.'
const BOTH_SOURCES_MESSAGE = 'Specify either a wallet name (-n) or a WIF (--wif), not both.'

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

// A wallet source is exactly one of a stored wallet name or an inline WIF.
function validateWalletSource (flags = {}) {
  if (flags.name && flags.wif) {
    throw new UsageError(BOTH_SOURCES_MESSAGE)
  }

  if (flags.wif) return true

  if (!flags.name) {
    throw new UsageError(WALLET_SOURCE_MESSAGE)
  }

  return validateWalletName(flags.name)
}

// Resolve the wallet a command should use: a stored wallet for a name, or a
// WIF source the wallet service derives in place.
function resolveWalletSource (walletStore, flags = {}) {
  if (flags.wif) return { wif: flags.wif }

  const wallet = walletStore.read(flags.name)
  if (!wallet) {
    throw new Error(`Wallet "${flags.name}" not found.`)
  }

  return wallet
}

class WalletCommand extends Command {
  constructor (deps = {}) {
    super(deps)

    // Encapsulate wallet dependencies so tests can replace them.
    attachWallet(this, deps)

    // Bind 'this' object to all subfunctions.
    this.validateFlags = this.validateFlags.bind(this)
    this.resolveWallet = this.resolveWallet.bind(this)
    this.execute = this.execute.bind(this)
    this.report = this.report.bind(this)
  }

  validateFlags (flags = {}) {
    return validateWalletSource(flags)
  }

  resolveWallet (flags = {}) {
    return resolveWalletSource(this.walletStore, flags)
  }
}

export { UsageError, attachWallet, validateWalletName, validateWalletSource, resolveWalletSource, WALLET_SOURCE_MESSAGE, BOTH_SOURCES_MESSAGE }
export default WalletCommand

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T15:43:51.454Z","module_hash":"1745791d2413d60d50aa5fe0a7575ba77563381fabf1bf55865ac909c5533ef9","functions":[{"id":"func/attachWallet","name":"attachWallet","line":15,"end_line":18,"hash":"700797b769341c93ac75f7786fcd3a5c760bc569fc8ca02ce6fe4226e396fa67"},{"id":"func/validateWalletName","name":"validateWalletName","line":25,"end_line":37,"hash":"45eadde06b3b2f4f28bb3fa067e1e56330d8fd0381021b103250c7867772e273"},{"id":"func/validateWalletSource","name":"validateWalletSource","line":40,"end_line":52,"hash":"5db188af751f589c6e6a910723537986a6e62a13e4b8e0be3d849a42fb8ad66e"},{"id":"func/resolveWalletSource","name":"resolveWalletSource","line":56,"end_line":65,"hash":"0750769dc5047b135e83c9955cfda7632f22346228a0e7452b855b100f44ab46"},{"id":"func/WalletCommand.constructor","name":"WalletCommand.constructor","line":68,"end_line":79,"hash":"aa22b242a5217607566edd51a5d6fbf68143ca2da8341c1f6438fbc8b63893b5"},{"id":"func/WalletCommand.validateFlags","name":"WalletCommand.validateFlags","line":81,"end_line":83,"hash":"c77aff15d0731c2ddfcaab7c3ebd999b82d6cb3a85ed9371f112aa4a18f7628c"},{"id":"func/WalletCommand.resolveWallet","name":"WalletCommand.resolveWallet","line":85,"end_line":87,"hash":"88b24d39da829b644a70d4445ab71be3831260d8903ec1e6db56be50fecac45f"}]}
// mutate4javascript-manifest-end
