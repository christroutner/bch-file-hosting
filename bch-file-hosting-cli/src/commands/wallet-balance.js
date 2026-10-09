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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T04:08:17.374Z","module_hash":"5c0923256eb4f045c7045d18cdecfa1587a4e22118fcb08a399d70e1c30f8200","functions":[{"id":"func/WalletBalance.execute","name":"WalletBalance.execute","line":13,"end_line":22,"hash":"f0108a567fb009fc041139f4088b05ec0b9d7d4f3ba933bf2a94cff578986246"},{"id":"func/WalletBalance.report","name":"WalletBalance.report","line":24,"end_line":26,"hash":"546805107e131050ae27eac54db89e159f4f3c457aa4def616f196c8c6db7306"}]}
// mutate4javascript-manifest-end
