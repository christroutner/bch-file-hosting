/*
  Runs async tasks one at a time per key, so two requests for the same payment
  address can never sweep or pin the same invoice twice.
*/

class KeyedLock {
  constructor () {
    this.tails = new Map()
  }

  run (key, task) {
    const previous = this.tails.get(key) || Promise.resolve()
    const result = previous.then(() => task())

    const tail = result.catch(() => {})
    this.tails.set(key, tail)
    tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key)
    })

    return result
  }

  get size () {
    return this.tails.size
  }
}

export default KeyedLock

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:20:25.353Z","module_hash":"2aa81f0b32cadeadec2aae4ff514bda7ad6f21d741894e783ec682b7e3862fae","functions":[{"id":"func/KeyedLock.constructor","name":"KeyedLock.constructor","line":7,"end_line":9,"hash":"68e24318179761da677bd5b460a18b7dd3e796ac64848b94dd5f6e51cf51778d"},{"id":"func/KeyedLock.run","name":"KeyedLock.run","line":11,"end_line":22,"hash":"5c283df18e74eebb155a02428e91d2ca06142938c4c34181da2790b201b25b39"},{"id":"func/KeyedLock.size","name":"KeyedLock.size","line":24,"end_line":26,"hash":"0e19791eb17faa835ec2acc954ce27a55d953437353ec309a25e3417c6e6ebd2"}]}
// mutate4javascript-manifest-end
