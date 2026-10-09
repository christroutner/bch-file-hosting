/*
  file-status command.

  Looks up a file record through the hosting API and prints its CID, name,
  size, status, hosting window, and pins. Returns the process exit code:
  0 success, 1 runtime error, 2 usage error.
*/

// Local libraries
import FileCommand, { UsageError } from '../lib/file-command.js'

class FileStatus extends FileCommand {
  constructor (deps) {
    super(deps)

    // Bind 'this' object to all subfunctions.
    this.validateFlags = this.validateFlags.bind(this)
    this.execute = this.execute.bind(this)
    this.report = this.report.bind(this)
  }

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
