/*
  file-list command.

  Lists the public feed through the hosting API, printing each hosted file's
  CID, name, size, paid time, hosting end, and download and view URLs, then the
  cursor for the next page when there is one. An empty feed prints a short
  message. Returns the process exit code: 0 success, 1 runtime error, 2 usage
  error.
*/

// Local libraries
import FileCommand, { UsageError } from '../lib/file-command.js'

class FileList extends FileCommand {
  validateFlags (flags = {}) {
    return true
  }

  async execute (flags = {}) {
    return this.hostingApi.listFiles({ limit: flags.limit, cursor: flags.cursor })
  }

  report (result, flags) {
    if (flags.json) {
      this.output(JSON.stringify(result))
      return
    }

    const files = result.files || []
    if (files.length === 0) {
      this.output('No files are hosted yet.')
      return
    }

    for (const file of files) {
      this.output(`CID: ${file.cid}`)
      this.output(`File name: ${file.filename}`)
      this.output(`Size: ${file.sizeBytes} bytes`)
      this.output(`Paid: ${file.paidAt}`)
      this.output(`Hosting end: ${file.hostedUntil}`)
      this.output(`Download URL: ${file.downloadUrl}`)
      this.output(`View URL: ${file.viewUrl}`)
    }

    if (result.nextCursor) {
      this.output(`Next cursor: ${result.nextCursor}`)
    }
  }
}

export { UsageError }
export default FileList
