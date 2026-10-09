/*
  REST controller for uploading, paying for, checking, and downloading files.
*/

import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

import { sendSuccess } from '../respond.js'
import { ValidationError } from '../../../use-cases/errors.js'

async function * restOf (first, iterator) {
  if (first.done) return
  yield first.value
  while (true) {
    const next = await iterator.next()
    if (next.done) return
    yield next.value
  }
}

class FilesController {
  constructor ({ useCases, logger } = {}) {
    if (!useCases) throw new Error('FilesController requires the use-cases')
    this.useCases = useCases
    this.logger = logger

    this.uploadFile = this.uploadFile.bind(this)
    this.checkPayment = this.checkPayment.bind(this)
    this.listFiles = this.listFiles.bind(this)
    this.getFileStatus = this.getFileStatus.bind(this)
    this.downloadFile = this.downloadFile.bind(this)
  }

  /**
   * @api {post} /files Upload a file and get a price quote
   * @apiDescription multipart/form-data with the file in the 'file' field.
   * Returns a payment address and price, or links if the file is already hosted.
   */
  async uploadFile (req, res) {
    if (!req.file) {
      throw new ValidationError("Upload a file in the multipart field 'file'")
    }

    const result = await this.useCases.files.uploadAndQuote({
      filePath: req.file.path,
      filename: req.file.originalname,
      sizeBytes: req.file.size
    })
    sendSuccess(res, result)
  }

  /**
   * @api {post} /files/check-payment Check whether an invoice has been paid
   * @apiBody {String} paymentAddress The address returned by POST /files
   */
  async checkPayment (req, res) {
    const paymentAddress = req.body?.paymentAddress
    const result = await this.useCases.payments.checkPayment({ paymentAddress })
    sendSuccess(res, result)
  }

  /**
   * @api {get} /files List the public feed of hosted files
   * @apiQuery {Number} [limit] Page size, 1 to 100 (default 20)
   * @apiQuery {String} [cursor] Opaque cursor from the previous page
   */
  async listFiles (req, res) {
    const result = await this.useCases.files.listFeed({
      limit: req.query.limit,
      cursor: req.query.cursor
    })
    sendSuccess(res, result)
  }

  /**
   * @api {get} /files/:cid Get the hosting status of a file
   */
  async getFileStatus (req, res) {
    const result = await this.useCases.files.getFileStatus({ cid: req.params.cid })
    sendSuccess(res, result)
  }

  /**
   * @api {get} /download/:cid Download a hosted file
   */
  async downloadFile (req, res) {
    const { filename, sizeBytes, content } = await this.useCases.files.getDownload({ cid: req.params.cid })

    // Read the first chunk before sending headers, so a failure to read the
    // file still produces a normal JSON error response.
    const iterator = content[Symbol.asyncIterator]()
    const first = await iterator.next()

    res.attachment(filename)
    if (Number.isInteger(sizeBytes)) res.set('Content-Length', String(sizeBytes))

    try {
      await pipeline(Readable.from(restOf(first, iterator)), res)
    } catch (err) {
      // Headers are already sent, so the status can't change; pipeline() has
      // closed the connection.
      this.logger?.error(`Download of ${req.params.cid} stopped: ${err.message}`)
    }
  }
}

export default FilesController

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T20:05:52.646Z","module_hash":"a22490df59b60a6af11b8d115a3da5611213d06cd6eb7a506aef1bf5b2a9fdad","functions":[{"id":"func/restOf","name":"restOf","line":11,"end_line":19,"hash":"5acb8efeeb9ef25f74e8590e2bd32603166583bc736bd16b475c8a0958562415"},{"id":"func/FilesController.constructor","name":"FilesController.constructor","line":22,"end_line":32,"hash":"b55837ddad353d98718b6d4ecb2f3826cf0ffa9e56a0a6716ea9a36bcc423834"},{"id":"func/FilesController.uploadFile","name":"FilesController.uploadFile","line":39,"end_line":50,"hash":"00535a26a5134891b09cf0678af33ab9c48bf0172e78409f655169049c0a7a5d"},{"id":"func/FilesController.checkPayment","name":"FilesController.checkPayment","line":56,"end_line":60,"hash":"70e1d10460e2426b3f50c55adbae8a2cf3bef3078cbfd561ba15bf50a97df413"},{"id":"func/FilesController.listFiles","name":"FilesController.listFiles","line":67,"end_line":73,"hash":"f65c456ef72960fc82cd881b2dcb7eb2e4b29b26bddeb83b1c81f52e085cd067"},{"id":"func/FilesController.getFileStatus","name":"FilesController.getFileStatus","line":78,"end_line":81,"hash":"9601e799149bbd7130a28a7a6b0e8f00f9cc7c61c1c9878d81c6baccbe6b65d4"},{"id":"func/FilesController.downloadFile","name":"FilesController.downloadFile","line":86,"end_line":104,"hash":"1b98b69e8b4a6f87bc8e0ef4b8b2d765c983a675821ede64f2dcc105053ad31b"}]}
// mutate4javascript-manifest-end
