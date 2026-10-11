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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T13:34:11.057Z","module_hash":"afb02584515d3aa735b7aa82a850d2ce5fd3f74d773f038d2eacb739dd02d32e","functions":[{"id":"func/FileList.validateFlags","name":"FileList.validateFlags","line":15,"end_line":17,"hash":"b209ee6a0a12efa73f326b13ca6c5221c8484fce43a0d2ec9da94c72ff1740d4"},{"id":"func/FileList.execute","name":"FileList.execute","line":19,"end_line":21,"hash":"e74fb7f1ace53e8e121a7e1dd09c37ca2867aad201c4cd90e5b6dcfe86e9e99d"},{"id":"func/FileList.report","name":"FileList.report","line":23,"end_line":48,"hash":"7c860a5bb73f2bbdf6dbbf17730829b97c7497c8d0dbddc274702c856effca0a"}]}
// mutate4javascript-manifest-end
