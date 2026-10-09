/*
  file-status command.

  Looks up a file record through the hosting API and prints its CID, name,
  size, status, hosting window, and pins. Returns the process exit code:
  0 success, 1 runtime error, 2 usage error.
*/

// Local libraries
import FileCommand, { UsageError } from '../lib/file-command.js'

class FileStatus extends FileCommand {
  validateFlags (flags = {}) {
    if (!flags.cid) {
      throw new UsageError('You must specify a CID with the -c flag.')
    }

    return true
  }

  async execute (flags = {}) {
    return this.hostingApi.getStatus({ cid: flags.cid })
  }

  report (result, flags) {
    if (flags.json) {
      this.output(JSON.stringify(result))
      return
    }

    this.output(`CID: ${result.cid}`)
    this.output(`File name: ${result.filename}`)
    this.output(`Size: ${result.sizeBytes} bytes`)
    this.output(`Status: ${result.status}`)
    this.output(`Hosting window: ${result.hostedUntil || 'not paid'}`)
    for (const pin of result.pins || []) {
      this.output(`Pin: ${pin.provider} ${pin.status}`)
    }
  }
}

export { UsageError }
export default FileStatus

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T13:32:39.033Z","module_hash":"99dc0d45bb77c0e095d9c04592bb1445d805427682bf51603611fa5842692da9","functions":[{"id":"func/FileStatus.validateFlags","name":"FileStatus.validateFlags","line":13,"end_line":19,"hash":"18281b832ea4597dd1cbab92ac55e89f8b8cd96f03cbb4342a3b0f14e6625a79"},{"id":"func/FileStatus.execute","name":"FileStatus.execute","line":21,"end_line":23,"hash":"b70a26c8f9eef3d3114a4235f8110a86ec45bccce475a5bb84356a33c3df87bb"},{"id":"func/FileStatus.report","name":"FileStatus.report","line":25,"end_line":39,"hash":"373b2f4c05b4b970025b48f558b06210f0f09bab07677f971b0500c6e5ed322b"}]}
// mutate4javascript-manifest-end
