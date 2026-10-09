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
