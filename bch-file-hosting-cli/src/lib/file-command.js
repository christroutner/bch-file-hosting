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
  }
}

export { UsageError }
export default FileCommand

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T04:11:17.675Z","module_hash":"ae3c567b2db01696656007e48c570bc93d3ea1a897c9ee597bb1becd668d7597","functions":[{"id":"func/FileCommand.constructor","name":"FileCommand.constructor","line":14,"end_line":19,"hash":"5bf7c3eaacfa11ffbb241023aa2f142391c7c8f876f014d33748c9e170e2b531"}]}
// mutate4javascript-manifest-end
