/*
  file-check command.

  Looks up a payment address through the hosting API and prints the result:
  paid (CID and links), unpaid (received/required satoshis and quote expiry),
  or expired. Returns the process exit code: 0 success, 1 runtime error,
  2 usage error.
*/

// Local libraries
import FileCommand, { UsageError } from '../lib/file-command.js'

class FileCheck extends FileCommand {
  validateFlags (flags = {}) {
    if (!flags.address) {
      throw new UsageError('You must specify a payment address with the -a flag.')
    }

    return true
  }

  async execute (flags = {}) {
    return this.hostingApi.checkPayment({ paymentAddress: flags.address })
  }

  report (result, flags) {
    if (flags.json) {
      this.output(JSON.stringify(result))
      return
    }

    if (result.status === 'paid') {
      this.output(`CID: ${result.cid}`)
      this.output(`Download URL: ${result.downloadUrl}`)
      this.output(`View URL: ${result.viewUrl}`)
      for (const url of result.gatewayUrls || []) {
        this.output(`Gateway URL: ${url}`)
      }
      return
    }

    if (result.status === 'unpaid') {
      this.output('Status: unpaid')
      this.output(`Received: ${result.receivedSats} satoshis`)
      this.output(`Required: ${result.requiredSats} satoshis`)
      this.output(`Quote expires: ${result.quoteExpiresAt}`)
      return
    }

    this.output(`Status: ${result.status}`)
  }
}

export { UsageError }
export default FileCheck

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T13:43:59.676Z","module_hash":"4e81f7f7e30b32aa9b5102b6e9e139e817d0bbeb496f3e12e1ff9e11a7e6f8b6","functions":[{"id":"func/FileCheck.validateFlags","name":"FileCheck.validateFlags","line":14,"end_line":20,"hash":"d516285975bcbfebe26a7bc246e12ce82bba6369d7d0b9e7469ef37aa2ce7999"},{"id":"func/FileCheck.execute","name":"FileCheck.execute","line":22,"end_line":24,"hash":"d1b92cecb74e1960f13c17ef12b34d8cdd3199d388a5bf70e449003943761c17"},{"id":"func/FileCheck.report","name":"FileCheck.report","line":26,"end_line":51,"hash":"71ad9589e784928f3f126bc2d2990bd889546d283302c9d21e6690265d427692"}]}
// mutate4javascript-manifest-end
