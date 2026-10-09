/*
  file-check command.

  Looks up a payment address through the hosting API and prints the result:
  paid (CID and links), unpaid (received/required satoshis and quote expiry),
  or expired. Returns the process exit code: 0 success, 1 runtime error,
  2 usage error.
*/

// Local libraries
import config from '../../config/index.js'
import HostingApi from '../lib/hosting-api.js'

// A flag validation failure, which maps to exit code 2.
class UsageError extends Error {}

class FileCheck {
  constructor ({ config: cfg = config, hostingApi, output = console.log, errorOutput = console.error } = {}) {
    // Encapsulate dependencies so tests can replace them.
    this.config = cfg
    this.hostingApi = hostingApi || new HostingApi({ config: cfg })
    this.output = output
    this.errorOutput = errorOutput

    // Bind 'this' object to all subfunctions.
    this.run = this.run.bind(this)
    this.validateFlags = this.validateFlags.bind(this)
    this.report = this.report.bind(this)
  }

  validateFlags (flags = {}) {
    if (!flags.address) {
      throw new UsageError('You must specify a payment address with the -a flag.')
    }

    return true
  }

  async run (flags = {}) {
    try {
      this.validateFlags(flags)

      const result = await this.hostingApi.checkPayment({ paymentAddress: flags.address })

      this.report(result, flags)

      return 0
    } catch (err) {
      this.errorOutput(err.message)
      return err instanceof UsageError ? 2 : 1
    }
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
