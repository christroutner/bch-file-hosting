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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T04:08:15.635Z","module_hash":"b0a3a3e0e41e42e7e53026c13d961625b6ec522d8f863a7366f5930a137efc0d","functions":[{"id":"func/WalletCreate.execute","name":"WalletCreate.execute","line":14,"end_line":23,"hash":"0b5d4ab1fe4d99c396c84ac103bfe556257046f4fa616541062c05df04c6be21"},{"id":"func/WalletCreate.report","name":"WalletCreate.report","line":25,"end_line":27,"hash":"dc6599360c45b0ff97d548616f32a695af7547ec9982412240380f73c20334fc"}]}
// mutate4javascript-manifest-end
