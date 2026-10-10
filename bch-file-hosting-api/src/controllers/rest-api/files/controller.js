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

// A file name is echoed in a Content-Disposition header, so drop characters
// that would end the quoted value or inject another header.
function headerFilename (filename) {
  return String(filename).replace(/["\\\r\n]/g, '')
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
    this.viewFile = this.viewFile.bind(this)
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
    const opened = await this.openContent(content)

    res.attachment(filename)
    await this.pipeContent(req, res, 'Download', sizeBytes, opened)
  }

  /**
   * @api {get} /view/:cid View a hosted file inline
   * @apiDescription Images and videos are served inline with their content
   * type; every other type is downloaded.
   */
  async viewFile (req, res) {
    const { filename, sizeBytes, content, contentType, disposition } = await this.useCases.files.getView({ cid: req.params.cid })

    const opened = await this.openContent(content)

    if (disposition === 'inline') {
      res.set('Content-Disposition', `inline; filename="${headerFilename(filename)}"`)
    } else {
      res.attachment(filename)
    }
    res.type(contentType)
    await this.pipeContent(req, res, 'View', sizeBytes, opened)
  }

  // Consume the first chunk of a content stream up front, so a failure to read
  // the file still produces a normal JSON error response.
  async openContent (content) {
    const iterator = content[Symbol.asyncIterator]()
    const first = await iterator.next()
    return { first, iterator }
  }

  // Stream the rest of an opened content stream to the response. Headers are
  // already sent, so a mid-stream failure can only be logged.
  async pipeContent (req, res, label, sizeBytes, { first, iterator }) {
    if (Number.isInteger(sizeBytes)) res.set('Content-Length', String(sizeBytes))

    try {
      await pipeline(Readable.from(restOf(first, iterator)), res)
    } catch (err) {
      this.logger?.error(`${label} of ${req.params.cid} stopped: ${err.message}`)
    }
  }
}

export default FilesController

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-10T20:14:44.781Z","module_hash":"7d0ef984f4d6c9a030fba120355a21761e7d37bda0bc21d825557fdf4eafb96f","functions":[{"id":"func/restOf","name":"restOf","line":11,"end_line":19,"hash":"5acb8efeeb9ef25f74e8590e2bd32603166583bc736bd16b475c8a0958562415"},{"id":"func/headerFilename","name":"headerFilename","line":23,"end_line":25,"hash":"f712b6795c0c4d77b16533fd43b14b6099b093685bf64ab54f3ee8e3bd999410"},{"id":"func/FilesController.constructor","name":"FilesController.constructor","line":28,"end_line":39,"hash":"27ddbc160d79edbdda5ca2bcba5fc1a6bd6b6cf50fbb5e4d551beb4729fe2a7b"},{"id":"func/FilesController.uploadFile","name":"FilesController.uploadFile","line":46,"end_line":57,"hash":"00535a26a5134891b09cf0678af33ab9c48bf0172e78409f655169049c0a7a5d"},{"id":"func/FilesController.checkPayment","name":"FilesController.checkPayment","line":63,"end_line":67,"hash":"70e1d10460e2426b3f50c55adbae8a2cf3bef3078cbfd561ba15bf50a97df413"},{"id":"func/FilesController.listFiles","name":"FilesController.listFiles","line":74,"end_line":80,"hash":"f65c456ef72960fc82cd881b2dcb7eb2e4b29b26bddeb83b1c81f52e085cd067"},{"id":"func/FilesController.getFileStatus","name":"FilesController.getFileStatus","line":85,"end_line":88,"hash":"9601e799149bbd7130a28a7a6b0e8f00f9cc7c61c1c9878d81c6baccbe6b65d4"},{"id":"func/FilesController.downloadFile","name":"FilesController.downloadFile","line":93,"end_line":102,"hash":"6e98fa78645b202e4bd1744430a39b0d65c5a658b1f047a33ca61847f14559f4"},{"id":"func/FilesController.viewFile","name":"FilesController.viewFile","line":109,"end_line":121,"hash":"3a961d324d3a7354e0c2858146259b55d4fc8f1f487cdefedc8d86623704654f"},{"id":"func/FilesController.openContent","name":"FilesController.openContent","line":125,"end_line":129,"hash":"c434e79e8165736ab7518c7524e73ecb14871364c804b147a9116916e88deb49"},{"id":"func/FilesController.pipeContent","name":"FilesController.pipeContent","line":133,"end_line":141,"hash":"88b86298ac1e4bb10e97c50c3a467e15be6acf9a9d01935ec46de62eb5c04a03"}]}
// mutate4javascript-manifest-end
