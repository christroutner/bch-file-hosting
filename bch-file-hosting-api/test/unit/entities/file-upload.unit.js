/*
  Unit tests for the FileUpload entity.
*/

import { assert } from 'chai'

import FileUpload from '../../../src/entities/file-upload.js'

describe('#file-upload.js', () => {
  let uut
  const maxFileSizeBytes = 1000

  beforeEach(() => {
    uut = new FileUpload()
  })

  describe('#validate', () => {
    it('should return the normalized file data', () => {
      const result = uut.validate({ filename: 'photo.jpg', sizeBytes: 500, maxFileSizeBytes })

      assert.deepEqual(result, { filename: 'photo.jpg', sizeBytes: 500 })
    })

    it('should accept a file exactly at the maximum size', () => {
      const result = uut.validate({ filename: 'a.txt', sizeBytes: 1000, maxFileSizeBytes })

      assert.equal(result.sizeBytes, 1000)
    })

    it('should strip directory parts from the file name', () => {
      const result = uut.validate({ filename: '../../etc/passwd', sizeBytes: 1, maxFileSizeBytes })

      assert.equal(result.filename, 'passwd')
    })

    it('should strip Windows directory parts from the file name', () => {
      const result = uut.validate({ filename: 'C:\\Users\\me\\doc.pdf', sizeBytes: 1, maxFileSizeBytes })

      assert.equal(result.filename, 'doc.pdf')
    })

    it('should strip control characters from the file name', () => {
      const result = uut.validate({ filename: 'bad\u0000name\n.txt', sizeBytes: 1, maxFileSizeBytes })

      assert.equal(result.filename, 'badname.txt')
    })

    it('should throw if the file name is missing', () => {
      assert.throws(
        () => uut.validate({ sizeBytes: 1, maxFileSizeBytes }),
        /'filename' must be a non-empty string/
      )
    })

    it('should throw if the file name is not a string', () => {
      assert.throws(
        () => uut.validate({ filename: 42, sizeBytes: 1, maxFileSizeBytes }),
        /'filename' must be a non-empty string/
      )
    })

    it('should throw if nothing usable is left of the file name', () => {
      assert.throws(
        () => uut.validate({ filename: '../', sizeBytes: 1, maxFileSizeBytes }),
        /usable file name/
      )
    })

    it('should throw if the file name is too long', () => {
      assert.throws(
        () => uut.validate({ filename: 'a'.repeat(256), sizeBytes: 1, maxFileSizeBytes }),
        /at most 255 characters/
      )
    })

    it('should throw if sizeBytes is negative', () => {
      assert.throws(
        () => uut.validate({ filename: 'a.txt', sizeBytes: -1, maxFileSizeBytes }),
        /'sizeBytes' must be a non-negative integer/
      )
    })

    it('should throw if sizeBytes is not an integer', () => {
      assert.throws(
        () => uut.validate({ filename: 'a.txt', sizeBytes: '10', maxFileSizeBytes }),
        /'sizeBytes' must be a non-negative integer/
      )
    })

    it('should throw if maxFileSizeBytes is missing', () => {
      assert.throws(
        () => uut.validate({ filename: 'a.txt', sizeBytes: 1 }),
        /'maxFileSizeBytes' must be a positive integer/
      )
    })

    it('should throw if the file is larger than the maximum size', () => {
      assert.throws(
        () => uut.validate({ filename: 'a.txt', sizeBytes: 1001, maxFileSizeBytes }),
        /exceeds the maximum size of 1000 bytes/
      )
    })

    it('should throw if called with no arguments', () => {
      assert.throws(() => uut.validate(), /'filename' must be a non-empty string/)
    })
  })
})
