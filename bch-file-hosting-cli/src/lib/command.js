/*
  Shared setup and run loop for CLI subcommands.

  Dependencies are injected so unit tests can replace them, and the base `run`
  maps command outcomes to process exit codes: 0 success, 2 usage error, and 1
  for every other failure. Subclasses implement `validateFlags`, `execute`, and
  `report`.
*/

// Local libraries
import config from '../../config/index.js'
import HostingApi from './hosting-api.js'

// A flag validation failure, which maps to exit code 2.
class UsageError extends Error {}

class Command {
  constructor ({ config: cfg = config, hostingApi, output = console.log, errorOutput = console.error } = {}) {
    // Encapsulate dependencies so tests can replace them.
    this.config = cfg
    this.hostingApi = hostingApi || new HostingApi({ config: cfg })
    this.output = output
    this.errorOutput = errorOutput

    // Bind 'this' object to all base methods.
    this.run = this.run.bind(this)
  }

  async run (flags = {}) {
    try {
      this.validateFlags(flags)

      const result = await this.execute(flags)

      this.report(result, flags)

      return 0
    } catch (err) {
      this.errorOutput(err.message)
      return err instanceof UsageError ? 2 : 1
    }
  }
}

export { UsageError }
export default Command

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T03:53:19.324Z","module_hash":"400da2c75c7bb036c849d736ee856f253762fe0a56e334e6874c21609206d142","functions":[{"id":"func/Command.constructor","name":"Command.constructor","line":18,"end_line":27,"hash":"a4ed036373b0bc553acfc941ab902736e9eb1b43e6c4358bb1753c8b5d75e435"},{"id":"func/Command.run","name":"Command.run","line":29,"end_line":42,"hash":"cc4678d5060aa6d544413d8d8e5becc0de219962541f2fecf3564b6e66859935"}]}
// mutate4javascript-manifest-end
