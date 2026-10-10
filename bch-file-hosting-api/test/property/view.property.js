/*
  Property tests for the view-content-type mapping (src/use-cases/view.js).

  Invariants: the result is always a content type plus an inline/attachment
  disposition; a disposition is inline exactly when the extension is a known
  media type, and every other name (including missing and empty names) is an
  octet-stream attachment; the mapping depends only on the final, lowercased
  extension, so it is case-insensitive and ignores the rest of the name.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import { viewType, DEFAULT_CONTENT_TYPE } from '../../src/use-cases/view.js'
import { forAll, integerBetween } from './lib/harness.js'

// The media extensions the module serves inline, with their expected types.
const INLINE = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['svg', 'image/svg+xml'],
  ['bmp', 'image/bmp'],
  ['avif', 'image/avif'],
  ['mp4', 'video/mp4'],
  ['webm', 'video/webm'],
  ['ogg', 'video/ogg']
])

const EXTENSIONS = [...INLINE.keys()]
const OTHER_EXTENSIONS = ['txt', 'tar', 'bin', 'pdf', 'xml', 'json', 'mp3', 'mov', 'jpeg2']

const NAME_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_#?%&'

function randomName (random) {
  let name = ''
  const length = integerBetween(random, 0, 20)
  for (let i = 0; i < length; i++) name += NAME_CHARS[integerBetween(random, 0, NAME_CHARS.length - 1)]
  return name
}

function randomExtension (random) {
  const pool = random() < 0.5 ? EXTENSIONS : OTHER_EXTENSIONS
  return pool[integerBetween(random, 0, pool.length - 1)]
}

function expectedType (extension) {
  const contentType = INLINE.get(extension)
  return contentType
    ? { contentType, disposition: 'inline' }
    : { contentType: DEFAULT_CONTENT_TYPE, disposition: 'attachment' }
}

describe('#view.property.js', () => {
  it('should always return a valid content type and disposition', () => {
    forAll({
      seed: 1,
      runs: 400,
      generate: (random) => ({ filename: randomName(random) }),
      property: ({ filename }) => {
        const result = viewType(filename)

        assert.deepEqual(Object.keys(result).sort(), ['contentType', 'disposition'])
        assert.isString(result.contentType)
        assert.isNotEmpty(result.contentType)
        assert.oneOf(result.disposition, ['inline', 'attachment'])

        if (result.disposition === 'inline') {
          assert.notEqual(result.contentType, DEFAULT_CONTENT_TYPE)
        } else {
          assert.equal(result.contentType, DEFAULT_CONTENT_TYPE)
        }
      }
    })
  })

  it('should map a final extension to its type and every other extension to octet-stream', () => {
    forAll({
      seed: 2,
      runs: 400,
      generate: (random) => ({ extension: randomExtension(random) }),
      property: ({ extension }) => {
        assert.deepEqual(viewType(`file.${extension}`), expectedType(extension))
      }
    })
  })

  it('should depend only on the final lowercased extension', () => {
    forAll({
      seed: 3,
      runs: 400,
      generate: (random) => {
        const extension = randomExtension(random)
        const base = randomName(random).replace(/\.+$/, '')
        const casing = random() < 0.5 ? extension.toUpperCase() : extension.toLowerCase()
        return { filename: `${base}.${casing}` }
      },
      property: ({ filename }) => {
        const expected = expectedType(filename.slice(filename.lastIndexOf('.') + 1).toLowerCase())

        assert.deepEqual(viewType(filename), expected)
        assert.deepEqual(viewType(filename.toUpperCase()), viewType(filename.toLowerCase()))
      }
    })
  })

  it('should treat a missing, empty, or dotless name as an octet-stream attachment', () => {
    forAll({
      seed: 4,
      runs: 200,
      generate: (random) => ({ filename: randomName(random).replace(/\./g, '') }),
      property: ({ filename }) => {
        assert.deepEqual(viewType(filename), {
          contentType: DEFAULT_CONTENT_TYPE,
          disposition: 'attachment'
        })
      }
    })
  })
})
