/*
  file-check command.

  Looks up a payment address through the hosting API and prints the result:
  paid (CID and links), unpaid (received/required satoshis and quote expiry),
  or expired. Returns the process exit code: 0 success, 1 runtime error,
  2 usage error.
*/

// Local libraries
import Command, { UsageError } from '../lib/command.js'

class FileCheck extends Command {
  constructor (deps) {
    super(deps)

    // Bind 'this' object to all subfunctions.
    this.validateFlags = this.validateFlags.bind(this)
    this.execute = this.execute.bind(this)
    this.report = this.report.bind(this)
  }

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
