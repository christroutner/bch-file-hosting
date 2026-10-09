/*
  Shared setup for file subcommands.

  File commands talk to the hosting REST API. Dependencies are injected so unit
  tests can replace them, and the default HostingApi adapter is constructed here
  rather than in the generic Command base, which stays free of IO adapters.
*/

// Local libraries
import Command, { UsageError } from './command.js'
import HostingApi from './hosting-api.js'

class FileCommand extends Command {
  constructor (deps = {}) {
    super(deps)

    // Encapsulate the API adapter so tests can replace it.
    this.hostingApi = deps.hostingApi || new HostingApi({ config: this.config })

    // Bind 'this' object to all subfunctions.
    this.validateFlags = this.validateFlags.bind(this)
    this.execute = this.execute.bind(this)
    this.report = this.report.bind(this)
  }
}

export { UsageError }
export default FileCommand

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T13:32:48.508Z","module_hash":"240cf4f9abd47893db6ec7a5c6dadac122846daed099addba62dac710603ee85","functions":[{"id":"func/FileCommand.constructor","name":"FileCommand.constructor","line":14,"end_line":24,"hash":"450de67ca7d0f753d7d7b6ebe956a8c667d5b2575775506358c91f0cb8af9ab3"}]}
// mutate4javascript-manifest-end
