/*
  file-upload command.

  Reads a local file, uploads it to the hosting API, and prints the quote
  (file name, size, billed size when it differs, price, payment address, and
  expiry), the already-hosted links, or the error. Returns the process exit
  code: 0 success, 1 runtime error, 2 usage error.
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
      this.output(`View URL: ${result.viewUrl}`)
      return
    }

    this.output(`File name: ${result.filename}`)
    this.output(`Size: ${result.sizeBytes} bytes`)

    // A separate billed line is only useful when billing rounds the size up, so
    // a file at or above the minimum shows a single size.
    if (result.billedBytes !== undefined && result.billedBytes !== result.sizeBytes) {
      this.output(`Billed size: ${result.billedBytes} bytes`)
    }

    this.output(`Price: ${result.priceSats} satoshis`)
    this.output(`Payment address: ${result.paymentAddress}`)

    if (result.quoteExpiresAt) {
      this.output(`Quote expires: ${result.quoteExpiresAt}`)
    }
  }
}

export { UsageError }
export default FileUpload

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T13:49:46.406Z","module_hash":"aaf4899d2f8b17cbb43b688b25a8622a7502700fc3032ac37b6b0189eb6ff5f1","functions":[{"id":"func/FileUpload.constructor","name":"FileUpload.constructor","line":18,"end_line":26,"hash":"9cc9df405cc690568d197dca583ba5abb7b77646a3a36e6e1512d52acda3d253"},{"id":"func/FileUpload.validateFlags","name":"FileUpload.validateFlags","line":28,"end_line":34,"hash":"14cbac7224cdb917a6c5c721e1db989de1804292b5036081639d5c1abfb83d4a"},{"id":"func/FileUpload.readFile","name":"FileUpload.readFile","line":36,"end_line":42,"hash":"c752a4ecde826e960e0b9a99d9507e95fa3064792e5ad41366d7c7eeba92f6ac"},{"id":"func/FileUpload.execute","name":"FileUpload.execute","line":44,"end_line":49,"hash":"2f80b172f7483c204e906852c059d53b2722d3c748e5056734749ab026e06223"},{"id":"func/FileUpload.report","name":"FileUpload.report","line":51,"end_line":78,"hash":"4ebc12cf9e8669df36062b8bbfa2d709f279586546e632d5e3206064c19c314f"}]}
// mutate4javascript-manifest-end
