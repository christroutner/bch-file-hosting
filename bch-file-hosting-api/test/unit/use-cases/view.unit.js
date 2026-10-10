/*
  Unit tests for the view-content-type mapping.
*/

import { assert } from 'chai'

import { viewType } from '../../../src/use-cases/view.js'

describe('#view.js', () => {
  describe('#viewType', () => {
    it('should serve images and videos inline with their content type', () => {
      const expected = {
        'photo.jpg': 'image/jpeg',
        'photo.jpeg': 'image/jpeg',
        'icon.png': 'image/png',
        'anim.gif': 'image/gif',
        'logo.webp': 'image/webp',
        'clip.mp4': 'video/mp4',
        'movie.webm': 'video/webm'
      }

      for (const [filename, contentType] of Object.entries(expected)) {
        assert.deepEqual(viewType(filename), { contentType, disposition: 'inline' }, filename)
      }
    })

    it('should match the extension case-insensitively', () => {
      assert.deepEqual(viewType('PHOTO.JPG'), { contentType: 'image/jpeg', disposition: 'inline' })
    })

    it('should download other file types as an octet stream', () => {
      assert.deepEqual(viewType('archive.tar'), {
        contentType: 'application/octet-stream',
        disposition: 'attachment'
      })
    })

    it('should download a file with no extension', () => {
      assert.deepEqual(viewType('README'), {
        contentType: 'application/octet-stream',
        disposition: 'attachment'
      })
    })

    it('should download a missing or empty filename', () => {
      for (const filename of [undefined, null, '']) {
        assert.deepEqual(viewType(filename), {
          contentType: 'application/octet-stream',
          disposition: 'attachment'
        })
      }
    })
  })
})
