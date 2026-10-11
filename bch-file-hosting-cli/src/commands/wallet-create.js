/*
  wallet-create command.

  Generates a new local wallet, stores it under the requested name, and prints
  its address. The mnemonic is written to the gitignored wallet store but is
  never printed. Returns the process exit code: 0 success, 1 runtime error,
  2 usage error.
*/

// Local libraries
import WalletCommand, { UsageError, validateWalletName } from '../lib/wallet-command.js'

class WalletCreate extends WalletCommand {
  // Creating a wallet always needs a new name; a WIF source does not apply.
  validateFlags (flags = {}) {
    return validateWalletName(flags.name)
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T15:44:39.105Z","module_hash":"62bfda9689ac0d2acfaaad5e8532d0e2d5b816f10c2a8eb687270273bc00e031","functions":[{"id":"func/WalletCreate.validateFlags","name":"WalletCreate.validateFlags","line":15,"end_line":17,"hash":"4b83ff89d8701e07726f947034e6c07c186b79622d2d9ac6e0930b04508d9172"},{"id":"func/WalletCreate.execute","name":"WalletCreate.execute","line":19,"end_line":28,"hash":"0b5d4ab1fe4d99c396c84ac103bfe556257046f4fa616541062c05df04c6be21"},{"id":"func/WalletCreate.report","name":"WalletCreate.report","line":30,"end_line":32,"hash":"dc6599360c45b0ff97d548616f32a695af7547ec9982412240380f73c20334fc"}]}
// mutate4javascript-manifest-end
