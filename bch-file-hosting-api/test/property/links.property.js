/*
  Property tests for the download/gateway link builder
  (src/use-cases/links.js).

  Invariants: every public gateway URL is the configured prefix followed by the
  CID and the URL-encoded file name; each provider receives the raw CID and file
  name and its URL is kept only when the provider returns one; the download URL
  points at /download/<cid> and the view URL at /view/<cid>/<encoded filename>,
  with no doubled slash when PUBLIC_URL ends with one; the view URL parses back
  to the original CID and file name.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import { buildLinks } from '../../src/use-cases/links.js'
import { forAll, integerBetween } from './lib/harness.js'

const NAME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789 .-_#?%&'
const CID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomName (random) {
  let name = ''
  const length = integerBetween(random, 1, 20)
  for (let i = 0; i < length; i++) name += NAME_CHARS[integerBetween(random, 0, NAME_CHARS.length - 1)]
  return name
}

function randomCid (random) {
  let cid = 'bafy'
  const length = integerBetween(random, 10, 40)
  for (let i = 0; i < length; i++) cid += CID_CHARS[integerBetween(random, 0, CID_CHARS.length - 1)]
  return cid
}

describe('#links.property.js', () => {
  it('should build every public gateway URL from the prefix, CID, and encoded name', () => {
    forAll({
      seed: 1,
      runs: 200,
      generate: (random) => {
        const prefixCount = integerBetween(random, 0, 3)
        const publicGateways = []
        for (let i = 0; i < prefixCount; i++) publicGateways.push(`https://gw${i}.example/ipfs/`)
        return { cid: randomCid(random), filename: randomName(random), publicGateways }
      },
      property: ({ cid, filename, publicGateways }) => {
        const result = buildLinks({
          cid,
          filename,
          config: { publicUrl: 'http://localhost:5050', publicGateways }
        })

        assert.equal(result.downloadUrl, `http://localhost:5050/download/${cid}`)
        assert.equal(result.viewUrl, `http://localhost:5050/view/${cid}/${encodeURIComponent(filename)}`)
        assert.deepEqual(
          result.gatewayUrls,
          publicGateways.map(prefix => `${prefix}${cid}/${encodeURIComponent(filename)}`)
        )
      }
    })
  })

  it('should pass the raw file name to each provider and keep only non-null URLs', () => {
    forAll({
      seed: 2,
      runs: 200,
      generate: (random) => ({
        cid: randomCid(random),
        filename: randomName(random),
        returnsUrl: random() < 0.5
      }),
      property: ({ cid, filename, returnsUrl }) => {
        const seen = []
        const providers = [{
          gatewayUrl: (providerCid, providerFilename) => {
            seen.push([providerCid, providerFilename])
            return returnsUrl
              ? `https://pin.example/ipfs/${providerCid}/${encodeURIComponent(providerFilename)}`
              : null
          }
        }]

        const result = buildLinks({
          cid,
          filename,
          config: { publicUrl: 'http://localhost:5050', publicGateways: [] },
          providers
        })

        assert.deepEqual(seen, [[cid, filename]])
        assert.deepEqual(
          result.gatewayUrls,
          returnsUrl ? [`https://pin.example/ipfs/${cid}/${encodeURIComponent(filename)}`] : []
        )
      }
    })
  })

  it('should build the view URL from the CID and the URL-encoded file name', () => {
    forAll({
      seed: 4,
      runs: 200,
      generate: (random) => ({ cid: randomCid(random), filename: randomName(random) }),
      property: ({ cid, filename }) => {
        const result = buildLinks({
          cid,
          filename,
          config: { publicUrl: 'http://localhost:5050', publicGateways: ['https://gw.example/ipfs/'] },
          providers: [{ gatewayUrl: () => 'https://pin.example/ipfs/x' }]
        })

        assert.equal(result.viewUrl, `http://localhost:5050/view/${cid}/${encodeURIComponent(filename)}`)
        assert.equal(result.downloadUrl, `http://localhost:5050/download/${cid}`)
      }
    })
  })

  it('should parse the view URL back to the original CID and file name', () => {
    forAll({
      seed: 5,
      runs: 200,
      generate: (random) => ({ cid: randomCid(random), filename: randomName(random) }),
      property: ({ cid, filename }) => {
        const result = buildLinks({
          cid,
          filename,
          config: { publicUrl: 'http://localhost:5050', publicGateways: [] }
        })

        const segments = new URL(result.viewUrl).pathname.split('/').filter(Boolean)
        assert.equal(segments[0], 'view')
        assert.equal(segments[1], cid)
        assert.equal(decodeURIComponent(segments.slice(2).join('/')), filename)
      }
    })
  })

  it('should not double a trailing slash on PUBLIC_URL when building the download or view URL', () => {
    forAll({
      seed: 3,
      runs: 100,
      generate: (random) => ({
        cid: randomCid(random),
        slashes: integerBetween(random, 1, 4)
      }),
      property: ({ cid, slashes }) => {
        const publicUrl = `https://files.example.com${'/'.repeat(slashes)}`

        const result = buildLinks({ cid, filename: 'a.txt', config: { publicUrl, publicGateways: [] } })

        assert.equal(result.downloadUrl, `https://files.example.com/download/${cid}`)
        assert.equal(result.viewUrl, `https://files.example.com/view/${cid}/a.txt`)
      }
    })
  })
})
