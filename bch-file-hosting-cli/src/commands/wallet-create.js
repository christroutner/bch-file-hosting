/*
  wallet-create command.

  Generates a new local wallet, stores it under the requested name, and prints
  its address. The mnemonic is written to the gitignored wallet store but is
  never printed. Returns the process exit code: 0 success, 1 runtime error,
  2 usage error.
*/

// Local libraries
import WalletCommand, { UsageError } from '../lib/wallet-command.js'

class WalletCreate extends WalletCommand {
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
