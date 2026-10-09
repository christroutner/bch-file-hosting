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
import Command, { UsageError } from '../lib/command.js'

class FileUpload extends Command {
  constructor (deps) {
    super(deps)

    this.fs = fs
    this.path = path

    // Bind 'this' object to all subfunctions.
    this.validateFlags = this.validateFlags.bind(this)
    this.readFile = this.readFile.bind(this)
    this.execute = this.execute.bind(this)
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
// {"version":1,"tested_at":"2026-10-09T03:36:07.251Z","module_hash":"a2a156be18e4030a6b48f45bf02df09b0b326077b67efafe1992a435063200d4","functions":[{"id":"func/FileUpload.constructor","name":"FileUpload.constructor","line":21,"end_line":35,"hash":"66d72aaa94a261454c83b70c0d91816f7d53162c3a8d067cc0f293d6d8ec1fa2"},{"id":"func/FileUpload.validateFlags","name":"FileUpload.validateFlags","line":37,"end_line":43,"hash":"14cbac7224cdb917a6c5c721e1db989de1804292b5036081639d5c1abfb83d4a"},{"id":"func/FileUpload.readFile","name":"FileUpload.readFile","line":45,"end_line":51,"hash":"c752a4ecde826e960e0b9a99d9507e95fa3064792e5ad41366d7c7eeba92f6ac"},{"id":"func/FileUpload.run","name":"FileUpload.run","line":53,"end_line":68,"hash":"f347da615c56a8db427abb75ae26e0674a8492e86a647dbfe5a5cea8549ddbe5"},{"id":"func/FileUpload.report","name":"FileUpload.report","line":70,"end_line":83,"hash":"d1f4a169a7938d8d4b8a7877d45c964c79ed701095530f969c4c41b40b911de0"}]}
// mutate4javascript-manifest-end
