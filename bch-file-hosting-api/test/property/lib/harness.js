/*
  A tiny deterministic property-testing harness.

  Property tests generate many random inputs from a seeded PRNG so any failure
  is reproducible. This keeps the property suite self-contained without adding a
  property-testing framework as a dependency.
*/

// mulberry32: a small, seedable 32-bit PRNG in [0, 1).
export function createRandom (seed = 1) {
  let state = seed >>> 0
  return function random () {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Inclusive integer generator.
export function integerBetween (random, min, max) {
  return min + Math.floor(random() * (max - min + 1))
}

// Run `property` over `runs` generated inputs. Throws with the seed, run, and
// counterexample so a failure can be replayed.
export function forAll ({ seed = 1, runs = 200, generate, property }) {
  const random = createRandom(seed)
  for (let run = 0; run < runs; run++) {
    const input = generate(random, run)
    try {
      property(input)
    } catch (err) {
      throw new Error(`property failed (seed=${seed}, run=${run}, input=${JSON.stringify(input)}): ${err.message}`)
    }
  }
}
