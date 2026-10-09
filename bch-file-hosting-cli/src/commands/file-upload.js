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
import FileCommand, { UsageError } from '../lib/file-command.js'

class FileUpload extends FileCommand {
  constructor (deps) {
    super(deps)

    this.fs = fs
    this.path = path

    // Bind 'this' object to all subfunctions.
    this.readFile = this.readFile.bind(this)
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

  async execute (flags = {}) {
    const filename = this.path.basename(flags.file)
    const buffer = this.readFile(flags.file)

    return this.hostingApi.upload({ filename, buffer })
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T13:32:59.972Z","module_hash":"22ccc3d6f606dd7ef97f502c67c5d076fb0d4c24ffc8648083ca7bd4cfa0cbfd","functions":[{"id":"func/FileUpload.constructor","name":"FileUpload.constructor","line":17,"end_line":25,"hash":"9cc9df405cc690568d197dca583ba5abb7b77646a3a36e6e1512d52acda3d253"},{"id":"func/FileUpload.validateFlags","name":"FileUpload.validateFlags","line":27,"end_line":33,"hash":"14cbac7224cdb917a6c5c721e1db989de1804292b5036081639d5c1abfb83d4a"},{"id":"func/FileUpload.readFile","name":"FileUpload.readFile","line":35,"end_line":41,"hash":"c752a4ecde826e960e0b9a99d9507e95fa3064792e5ad41366d7c7eeba92f6ac"},{"id":"func/FileUpload.execute","name":"FileUpload.execute","line":43,"end_line":48,"hash":"2f80b172f7483c204e906852c059d53b2722d3c748e5056734749ab026e06223"},{"id":"func/FileUpload.report","name":"FileUpload.report","line":50,"end_line":63,"hash":"d1f4a169a7938d8d4b8a7877d45c964c79ed701095530f969c4c41b40b911de0"}]}
// mutate4javascript-manifest-end
