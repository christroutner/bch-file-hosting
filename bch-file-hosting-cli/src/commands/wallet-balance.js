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
    const wallet = this.resolveWallet(flags)
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
// {"version":1,"tested_at":"2026-10-11T15:44:36.673Z","module_hash":"9290dfc862c5b9a6a18c79079b5076871c778ae370d8039f1464910901eab266","functions":[{"id":"func/WalletBalance.execute","name":"WalletBalance.execute","line":13,"end_line":18,"hash":"7d7724bb3c81ed1d48b4b8684ee9021f1250257611c0befd033868d0f878c93f"},{"id":"func/WalletBalance.report","name":"WalletBalance.report","line":20,"end_line":22,"hash":"546805107e131050ae27eac54db89e159f4f3c457aa4def616f196c8c6db7306"}]}
// mutate4javascript-manifest-end
