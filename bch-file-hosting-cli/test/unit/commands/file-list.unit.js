/*
  Unit tests for the file-list command.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import FileList from '../../../src/commands/file-list.js'
import HostingApi from '../../../src/lib/hosting-api.js'

const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'

describe('#file-list', () => {
  let sandbox
  let uut
  let output
  let errorOutput

  const config = { apiUrl: 'http://localhost:5050' }

  const file = {
    cid: CID,
    filename: 'photo.jpg',
    sizeBytes: 1024,
    paidAt: '2026-10-10T00:00:00.000Z',
    hostedUntil: '2027-10-10T00:00:00.000Z',
    downloadUrl: `http://localhost:5050/download/${CID}`,
    viewUrl: `http://localhost:5050/view/${CID}/photo.jpg`
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    output = []
    errorOutput = []

    uut = new FileList({
      config,
      hostingApi: { listFiles: sandbox.stub() },
      output: (msg) => output.push(msg),
      errorOutput: (msg) => errorOutput.push(msg)
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#validateFlags', () => {
    it('should accept no flags', () => {
      assert.equal(uut.validateFlags({}), true)
    })
  })

  describe('#run', () => {
    it('should print each file with its details and links, then the next cursor', async () => {
      uut.hostingApi.listFiles.resolves({ success: true, files: [file], nextCursor: 'next-token' })

      const result = await uut.run({})

      assert.equal(result, 0)

      const printed = output.join('\n')
      assert.include(printed, `CID: ${CID}`)
      assert.include(printed, 'File name: photo.jpg')
      assert.include(printed, 'Size: 1024 bytes')
      assert.include(printed, 'Paid: 2026-10-10T00:00:00.000Z')
      assert.include(printed, 'Hosting end: 2027-10-10T00:00:00.000Z')
      assert.include(printed, `Download URL: http://localhost:5050/download/${CID}`)
      assert.include(printed, `View URL: http://localhost:5050/view/${CID}/photo.jpg`)
      assert.include(printed, 'Next cursor: next-token')

      sinon.assert.calledWith(uut.hostingApi.listFiles, { limit: undefined, cursor: undefined })
    })

    it('should print every file of the page in feed order', async () => {
      uut.hostingApi.listFiles.resolves({
        success: true,
        files: [file, { ...file, cid: 'bafy-b', filename: 'notes.txt' }],
        nextCursor: null
      })

      const result = await uut.run({})

      assert.equal(result, 0)
      assert.isBelow(output.indexOf('File name: photo.jpg'), output.indexOf('File name: notes.txt'))
    })

    it('should print the empty message when the feed has no files', async () => {
      uut.hostingApi.listFiles.resolves({ success: true, files: [], nextCursor: null })

      const result = await uut.run({})

      assert.equal(result, 0)
      assert.deepEqual(output, ['No files are hosted yet.'])
    })

    it('should treat a response without a files array as an empty feed', async () => {
      uut.hostingApi.listFiles.resolves({ success: true, nextCursor: null })

      const result = await uut.run({})

      assert.equal(result, 0)
      assert.deepEqual(output, ['No files are hosted yet.'])
    })

    it('should pass the limit and cursor flags to the API', async () => {
      uut.hostingApi.listFiles.resolves({ success: true, files: [], nextCursor: null })

      const result = await uut.run({ limit: '5', cursor: 'next-token' })

      assert.equal(result, 0)
      sinon.assert.calledWith(uut.hostingApi.listFiles, { limit: '5', cursor: 'next-token' })
    })

    it('should return 1 and print the API error when the feed is rejected', async () => {
      uut.hostingApi.listFiles.rejects(new Error('Hosting API unavailable'))

      const result = await uut.run({})

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'Hosting API unavailable')
    })

    it('should print a single JSON object when --json is set', async () => {
      uut.hostingApi.listFiles.resolves({ success: true, files: [file], nextCursor: 'next-token' })

      const result = await uut.run({ json: true })

      assert.equal(result, 0)
      assert.equal(output.length, 1)

      const parsed = JSON.parse(output[0])
      assert.deepEqual(parsed.files, [file])
      assert.equal(parsed.nextCursor, 'next-token')
    })
  })

  describe('#constructor', () => {
    it('should build a default HostingApi from the config', () => {
      const defaultUut = new FileList({ config })

      assert.instanceOf(defaultUut.hostingApi, HostingApi)
    })
  })
})
