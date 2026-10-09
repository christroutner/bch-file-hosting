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
