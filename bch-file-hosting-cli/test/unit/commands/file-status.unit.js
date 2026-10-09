/*
  Unit tests for the file-status command.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import FileStatus, { UsageError } from '../../../src/commands/file-status.js'
import HostingApi from '../../../src/lib/hosting-api.js'

const USAGE_MESSAGE = 'You must specify a CID with the -c flag.'
const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'

describe('#file-status', () => {
  let sandbox
  let uut
  let output
  let errorOutput

  const config = { apiUrl: 'http://localhost:5050' }

  const file = {
    success: true,
    cid: CID,
    filename: 'photo.jpg',
    sizeBytes: 1024,
    status: 'pinned',
    hostedUntil: '2027-10-09T00:00:00.000Z',
    pins: [{ provider: 'local-helia', status: 'pinned' }]
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    output = []
    errorOutput = []

    uut = new FileStatus({
      config,
      hostingApi: { getStatus: sandbox.stub() },
      output: (msg) => output.push(msg),
      errorOutput: (msg) => errorOutput.push(msg)
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#validateFlags', () => {
    it('should throw a usage error when no CID is given', () => {
      try {
        uut.validateFlags({})
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, USAGE_MESSAGE)
      }
    })

    it('should return true when a CID is given', () => {
      assert.equal(uut.validateFlags({ cid: CID }), true)
    })
  })

  describe('#run', () => {
    it('should print the file details and pins', async () => {
      uut.hostingApi.getStatus.resolves(file)

      const result = await uut.run({ cid: CID })

      assert.equal(result, 0)

      const printed = output.join('\n')
      assert.include(printed, `CID: ${CID}`)
      assert.include(printed, 'File name: photo.jpg')
      assert.include(printed, 'Size: 1024 bytes')
      assert.include(printed, 'Status: pinned')
      assert.include(printed, 'Hosting window: 2027-10-09T00:00:00.000Z')
      assert.include(printed, 'Pin: local-helia pinned')

      sinon.assert.calledWith(uut.hostingApi.getStatus, { cid: CID })
    })

    it('should print "not paid" for a staged file with no hosting window', async () => {
      uut.hostingApi.getStatus.resolves({
        ...file,
        status: 'staged',
        hostedUntil: null,
        pins: []
      })

      const result = await uut.run({ cid: CID })

      assert.equal(result, 0)
      assert.include(output.join('\n'), 'Hosting window: not paid')
    })

    it('should print every pin in the file record', async () => {
      uut.hostingApi.getStatus.resolves({
        ...file,
        pins: [
          { provider: 'local-helia', status: 'pinned' },
          { provider: 'lighthouse', status: 'failed' }
        ]
      })

      const result = await uut.run({ cid: CID })

      assert.equal(result, 0)
      assert.include(output.join('\n'), 'Pin: local-helia pinned')
      assert.include(output.join('\n'), 'Pin: lighthouse failed')
    })

    it('should print no pins when the file record has none', async () => {
      const { pins, ...withoutPins } = file
      uut.hostingApi.getStatus.resolves(withoutPins)

      const result = await uut.run({ cid: CID })

      assert.equal(result, 0)
      assert.include(output.join('\n'), `CID: ${CID}`)
      assert.notInclude(output.join('\n'), 'Pin:')
    })

    it('should return 1 and print the API error when the lookup is rejected', async () => {
      uut.hostingApi.getStatus.rejects(new Error('File not found'))

      const result = await uut.run({ cid: CID })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'File not found')
    })

    it('should return 2 and print the usage message when the CID flag is missing', async () => {
      const result = await uut.run({})

      assert.equal(result, 2)
      assert.include(errorOutput.join('\n'), USAGE_MESSAGE)
      sinon.assert.notCalled(uut.hostingApi.getStatus)
    })

    it('should print a single JSON object when --json is set', async () => {
      uut.hostingApi.getStatus.resolves(file)

      const result = await uut.run({ cid: CID, json: true })

      assert.equal(result, 0)
      assert.equal(output.length, 1)

      const parsed = JSON.parse(output[0])
      assert.equal(parsed.status, 'pinned')
      assert.equal(parsed.cid, CID)
      assert.deepEqual(parsed.pins, file.pins)
    })
  })

  describe('#constructor', () => {
    it('should build a default HostingApi from the config', () => {
      const defaultUut = new FileStatus({ config })

      assert.instanceOf(defaultUut.hostingApi, HostingApi)
    })
  })
})
