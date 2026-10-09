/*
  wallet-balance command.

  Reads a named local wallet and prints its integer satoshi balance. The
  mnemonic is never printed. Returns the process exit code: 0 success,
  1 runtime error, 2 usage error.
*/

// Local libraries
import Command, { UsageError } from '../lib/command.js'
import WalletStore from '../lib/wallet-store.js'
import WalletService from '../lib/wallet-service.js'

class WalletBalance extends Command {
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
    const wallet = this.walletStore.read(flags.name)
    if (!wallet) {
      throw new Error(`Wallet "${flags.name}" not found.`)
    }

    const satoshis = await this.walletService.balanceSats(wallet)

    return { name: flags.name, satoshis }
  }

  report (result) {
    this.output(`Balance: ${result.satoshis} satoshis`)
  }
}

export { UsageError }
export default WalletBalance
