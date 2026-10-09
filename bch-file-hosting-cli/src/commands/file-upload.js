/*
  file-upload command.

  Reads a local file, uploads it to the hosting API, and prints the quote
  (price and payment address), the already-hosted download link, or the error.
  Returns the process exit code: 0 success, 1 runtime error, 2 usage error.
*/

// Global npm libraries
import fs from 'node:fs'
import path from 'node:path'

// Local libraries
import config from '../../config/index.js'
import HostingApi from '../lib/hosting-api.js'

// A flag validation failure, which maps to exit code 2.
class UsageError extends Error {}

class FileUpload {
  constructor ({ config: cfg = config, hostingApi, output = console.log, errorOutput = console.error } = {}) {
    // Encapsulate dependencies so tests can replace them.
    this.config = cfg
    this.hostingApi = hostingApi || new HostingApi({ config: cfg })
    this.output = output
    this.errorOutput = errorOutput
    this.fs = fs
    this.path = path

    // Bind 'this' object to all subfunctions.
    this.run = this.run.bind(this)
    this.validateFlags = this.validateFlags.bind(this)
    this.readFile = this.readFile.bind(this)
    this.report = this.report.bind(this)
  }

  validateFlags (flags = {}) {
    if (!flags.file) {
      throw new UsageError('You must specify a file with the -f flag.')
    }

    return true
  }

  readFile (filePath) {
    try {
      return this.fs.readFileSync(filePath)
    } catch (err) {
      throw new Error(`Cannot read file: ${filePath}`)
    }
  }

  async run (flags = {}) {
    try {
      this.validateFlags(flags)

      const filename = this.path.basename(flags.file)
      const buffer = this.readFile(flags.file)
      const result = await this.hostingApi.upload({ filename, buffer })

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

    if (result.alreadyHosted) {
      this.output(`Already hosted: ${result.downloadUrl}`)
      return
    }

    this.output(`Price: ${result.priceSats} satoshis`)
    this.output(`Payment address: ${result.paymentAddress}`)
  }
}

export { UsageError }
export default FileUpload
