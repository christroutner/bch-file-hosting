/*
  Shared setup for the use-case libraries. The adapters and config are injected
  so unit tests can replace them, and `now` is encapsulated so tests control the
  clock.
*/

class UseCase {
  constructor ({ adapters, name } = {}) {
    if (!adapters) throw new Error(`${name} requires the adapters`)
    this.adapters = adapters
    this.config = adapters.config

    // Encapsulated for unit tests.
    this.now = () => new Date()
  }
}

export default UseCase
