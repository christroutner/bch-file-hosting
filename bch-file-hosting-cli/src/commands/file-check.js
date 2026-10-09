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
// {"version":1,"tested_at":"2026-10-09T04:11:25.790Z","module_hash":"d0dbdf711786b7a2de8b62e949aef205e2f035aec15b54182a72ec01611d2ed8","functions":[{"id":"func/FileCheck.constructor","name":"FileCheck.constructor","line":14,"end_line":21,"hash":"4c2caff0feca92ece20635afce34e3210bca308eabb7b9b8848733631494e409"},{"id":"func/FileCheck.validateFlags","name":"FileCheck.validateFlags","line":23,"end_line":29,"hash":"d516285975bcbfebe26a7bc246e12ce82bba6369d7d0b9e7469ef37aa2ce7999"},{"id":"func/FileCheck.execute","name":"FileCheck.execute","line":31,"end_line":33,"hash":"d1b92cecb74e1960f13c17ef12b34d8cdd3199d388a5bf70e449003943761c17"},{"id":"func/FileCheck.report","name":"FileCheck.report","line":35,"end_line":59,"hash":"053fdb2846ff8b5d906ff8ed6e250498ad47b42ce10439fd096d9e2b21399397"}]}
// mutate4javascript-manifest-end
