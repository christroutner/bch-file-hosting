/*
  Shared setup and run loop for CLI subcommands.

  Dependencies are injected so unit tests can replace them, and the base `run`
  maps command outcomes to process exit codes: 0 success, 2 usage error, and 1
  for every other failure. Subclasses implement `validateFlags`, `execute`, and
  `report`.
*/

// Local libraries
import config from '../../config/index.js'

// A flag validation failure, which maps to exit code 2.
class UsageError extends Error {}

class Command {
  constructor ({ config: cfg = config, output = console.log, errorOutput = console.error } = {}) {
    // Encapsulate dependencies so tests can replace them.
    this.config = cfg
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
// {"version":1,"tested_at":"2026-10-09T04:11:15.215Z","module_hash":"a9d52bafdad8f01034b16106fae70ffe30d634c4127a785f7b8bc16f114ec4f6","functions":[{"id":"func/Command.constructor","name":"Command.constructor","line":17,"end_line":25,"hash":"c107afebc0eb130b4e9a5ab894728063f4258fdc56f1ea6e0bf3769d1c5f75f0"},{"id":"func/Command.run","name":"Command.run","line":27,"end_line":40,"hash":"cc4678d5060aa6d544413d8d8e5becc0de219962541f2fecf3564b6e66859935"}]}
// mutate4javascript-manifest-end
