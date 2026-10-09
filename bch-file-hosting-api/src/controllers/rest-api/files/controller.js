/*
  REST controller for uploading, paying for, checking, and downloading files.
*/

import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

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
    res.json({ success: true, ...result })
  }

  /**
   * @api {post} /files/check-payment Check whether an invoice has been paid
   * @apiBody {String} paymentAddress The address returned by POST /files
   */
  async checkPayment (req, res) {
    const paymentAddress = req.body?.paymentAddress
    const result = await this.useCases.payments.checkPayment({ paymentAddress })
    res.json({ success: true, ...result })
  }

  /**
   * @api {get} /files/:cid Get the hosting status of a file
   */
  async getFileStatus (req, res) {
    const result = await this.useCases.files.getFileStatus({ cid: req.params.cid })
    res.json({ success: true, ...result })
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
