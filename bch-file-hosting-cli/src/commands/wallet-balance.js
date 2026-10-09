/*
  wallet-balance command.

  Reads a named local wallet and prints its integer satoshi balance. The
  mnemonic is never printed. Returns the process exit code: 0 success,
  1 runtime error, 2 usage error.
*/

// Local libraries
import WalletCommand, { UsageError } from '../lib/wallet-command.js'

class WalletBalance extends WalletCommand {
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
