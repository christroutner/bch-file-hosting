/*
  Unit tests for the file-upload command.
*/

// Global npm libraries
import fs from 'node:fs'
import path from 'node:path'
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import FileUpload, { UsageError } from '../../../src/commands/file-upload.js'
import HostingApi from '../../../src/lib/hosting-api.js'

const USAGE_MESSAGE = 'You must specify a file with the -f flag.'

describe('#file-upload', () => {
  let sandbox
  let uut
  let output
  let errorOutput
  let tmpDir
  let fixture

  const config = { apiUrl: 'http://localhost:5050' }

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    tmpDir = path.join(process.cwd(), 'tmp', 'unit')
    fs.mkdirSync(tmpDir, { recursive: true })
    fixture = path.join(tmpDir, 'photo.jpg')
    fs.writeFileSync(fixture, 'file bytes')

    output = []
    errorOutput = []

    uut = new FileUpload({
      config,
      hostingApi: { upload: sandbox.stub() },
      output: (msg) => output.push(msg),
      errorOutput: (msg) => errorOutput.push(msg)
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#validateFlags', () => {
    it('should throw a usage error when no file is given', () => {
      try {
        uut.validateFlags({})
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, USAGE_MESSAGE)
      }
    })

    it('should return true when a file is given', () => {
      assert.equal(uut.validateFlags({ file: fixture }), true)
    })
  })

  describe('#run', () => {
    it('should print the quote and return 0 on success', async () => {
      uut.hostingApi.upload.resolves({
        success: true,
        cid: 'bafy-quote',
        priceSats: 2000,
        paymentAddress: 'bitcoincash:qtestaddress'
      })

      const result = await uut.run({ file: fixture })

      assert.equal(result, 0)
      assert.include(output.join('\n'), '2000 satoshis')
      assert.include(output.join('\n'), 'bitcoincash:qtestaddress')

      const [uploadArgs] = uut.hostingApi.upload.firstCall.args
      assert.equal(uploadArgs.filename, 'photo.jpg')
      assert.instanceOf(uploadArgs.buffer, Buffer)
    })

    it('should print the download URL and no payment address when already hosted', async () => {
      const downloadUrl = 'http://localhost:5050/download/bafy-already'
      uut.hostingApi.upload.resolves({
        success: true,
        alreadyHosted: true,
        downloadUrl
      })

      const result = await uut.run({ file: fixture })

      assert.equal(result, 0)
      assert.include(output.join('\n'), downloadUrl)
      assert.notInclude(output.join('\n'), 'Payment address')
    })

    it('should return 1 and print the API error when the upload is rejected', async () => {
      uut.hostingApi.upload.rejects(new Error('File is too large'))

      const result = await uut.run({ file: fixture })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'File is too large')
    })

    it('should return 2 and print the usage message when the file flag is missing', async () => {
      const result = await uut.run({})

      assert.equal(result, 2)
      assert.include(errorOutput.join('\n'), USAGE_MESSAGE)
      sinon.assert.notCalled(uut.hostingApi.upload)
    })

    it('should return 1 and report a missing local file', async () => {
      const missing = path.join(tmpDir, 'absent.bin')

      const result = await uut.run({ file: missing })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'Cannot read file')
      sinon.assert.notCalled(uut.hostingApi.upload)
    })

    it('should print a single JSON object when --json is set', async () => {
      uut.hostingApi.upload.resolves({
        success: true,
        cid: 'bafy-quote',
        priceSats: 62500,
        paymentAddress: 'bitcoincash:qother'
      })

      const result = await uut.run({ file: fixture, json: true })

      assert.equal(result, 0)
      assert.equal(output.length, 1)

      const parsed = JSON.parse(output[0])
      assert.equal(parsed.priceSats, 62500)
      assert.equal(parsed.paymentAddress, 'bitcoincash:qother')
    })
  })

  describe('#constructor', () => {
    it('should build a default HostingApi from the config', () => {
      const defaultUut = new FileUpload({ config })

      assert.instanceOf(defaultUut.hostingApi, HostingApi)
    })
  })
})
