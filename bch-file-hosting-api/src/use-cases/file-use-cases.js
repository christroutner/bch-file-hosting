/*
  File use-cases: accept an upload and quote a price, report file status, and
  serve paid files for download.
*/

import { unlink } from 'fs/promises'

import FileUpload, { FILE_STATUS, isPaidFileStatus } from '../entities/file-upload.js'
import Invoice, { INVOICE_STATUS } from '../entities/invoice.js'
import UseCase from './use-case.js'
import { calculatePrice } from './pricing.js'
import { buildLinks } from './links.js'
import { paginateFeed } from './file-feed.js'
import { NotFoundError, ValidationError } from './errors.js'

const MS_PER_HOUR = 60 * 60 * 1000

class FileUseCases extends UseCase {
  constructor ({ adapters } = {}) {
    super({ adapters, name: 'FileUseCases' })

    this.fileUpload = new FileUpload()
    this.invoice = new Invoice()

    // Encapsulated for unit tests.
    this.unlink = unlink

    this.uploadAndQuote = this.uploadAndQuote.bind(this)
    this.listFeed = this.listFeed.bind(this)
    this.getFileStatus = this.getFileStatus.bind(this)
    this.getDownload = this.getDownload.bind(this)
  }

  // Add an uploaded temp file to IPFS and return a quote with a fresh payment
  // address. The temp file is always deleted, whether or not this succeeds.
  async uploadAndQuote ({ filePath, filename, sizeBytes }) {
    try {
      let file
      try {
        file = this.fileUpload.validate({
          filename,
          sizeBytes,
          maxFileSizeBytes: this.config.maxFileSizeBytes
        })
      } catch (err) {
        throw new ValidationError(err.message)
      }

      const { ipfs, localdb, wallet } = this.adapters
      const cid = await ipfs.addFile({ filePath, filename: file.filename })

      const existingResult = await this.existingQuote(await localdb.files.get(cid))
      if (existingResult) return existingResult

      const usdPerBch = await wallet.getUsdPerBch()
      const price = calculatePrice({ sizeBytes: file.sizeBytes, usdPerBch, cfg: this.config })

      const hdIndex = await localdb.meta.nextHdIndex()
      const { cashAddress } = await wallet.getKeyPair(hdIndex)

      const now = this.now()
      const invoice = this.invoice.validate({
        paymentAddress: cashAddress,
        hdIndex,
        cid,
        filename: file.filename,
        sizeBytes: file.sizeBytes,
        billedBytes: price.billedBytes,
        priceSats: price.priceSats,
        usdPrice: price.usdPrice,
        usdPerBch,
        createdAt: now.toISOString(),
        quoteExpiresAt: new Date(now.getTime() + this.config.quoteTtlHours * MS_PER_HOUR).toISOString()
      })

      await localdb.invoices.create(invoice)
      await localdb.files.put({
        cid,
        filename: file.filename,
        sizeBytes: file.sizeBytes,
        paymentAddress: cashAddress,
        status: FILE_STATUS.STAGED,
        pins: [],
        createdAt: invoice.createdAt,
        paidAt: null,
        hostedUntil: null
      })

      this.adapters.logger.info('Quoted upload', { cid, paymentAddress: cashAddress, priceSats: price.priceSats })
      return this.toQuote(invoice)
    } finally {
      await this.removeTempFile(filePath)
    }
  }

  // A previously uploaded file may already be hosted (paid) or still have an
  // open quote. In both cases the upload returns that result instead of a new
  // payment address.
  async existingQuote (existing) {
    if (!existing) return null
    if (isPaidFileStatus(existing.status)) return this.alreadyHosted(existing)
    if (existing.status !== FILE_STATUS.STAGED) return null

    const openInvoice = await this.getOpenInvoice(existing.paymentAddress)
    return openInvoice ? this.toQuote(openInvoice) : null
  }

  // An invoice for the same file that can still be paid, so re-uploading an
  // unpaid file returns the same quote instead of a second payment address.
  async getOpenInvoice (paymentAddress) {
    const invoice = await this.adapters.localdb.invoices.get(paymentAddress)
    if (!invoice || invoice.status !== INVOICE_STATUS.AWAITING_PAYMENT) return null
    if (this.invoice.isQuoteExpired({ quoteExpiresAt: invoice.quoteExpiresAt, now: this.now() })) return null
    return invoice
  }

  async removeTempFile (filePath) {
    if (!filePath) return
    try {
      await this.unlink(filePath)
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.adapters.logger.error(`Could not delete temp upload ${filePath}: ${err.message}`)
      }
    }
  }

  toQuote (invoice) {
    return {
      alreadyHosted: false,
      cid: invoice.cid,
      filename: invoice.filename,
      sizeBytes: invoice.sizeBytes,
      billedBytes: invoice.billedBytes,
      priceSats: invoice.priceSats,
      priceBch: invoice.priceSats / 1e8,
      usdPrice: invoice.usdPrice,
      paymentAddress: invoice.paymentAddress,
      quoteExpiresAt: invoice.quoteExpiresAt
    }
  }

  alreadyHosted (file) {
    return {
      alreadyHosted: true,
      cid: file.cid,
      filename: file.filename,
      sizeBytes: file.sizeBytes,
      hostedUntil: file.hostedUntil,
      ...this.links(file)
    }
  }

  links (file) {
    return buildLinks({
      cid: file.cid,
      filename: file.filename,
      config: this.config,
      providers: this.adapters.pinning.getProviders()
    })
  }

  // One page of the public feed: paid files, newest paid first, limited and
  // paginated by an opaque cursor.
  async listFeed ({ limit, cursor } = {}) {
    const files = await this.adapters.localdb.files.list()
    try {
      return paginateFeed(files, { limit, cursor })
    } catch (err) {
      throw new ValidationError(err.message)
    }
  }

  async getFileStatus ({ cid }) {
    const file = await this.adapters.localdb.files.get(cid)
    if (!file) throw new NotFoundError(`File not found: ${cid}`)

    return {
      cid: file.cid,
      filename: file.filename,
      sizeBytes: file.sizeBytes,
      status: file.status,
      pins: file.pins,
      paidAt: file.paidAt,
      hostedUntil: file.hostedUntil
    }
  }

  // Only paid files can be downloaded from this service.
  async getDownload ({ cid }) {
    const file = await this.adapters.localdb.files.get(cid)
    if (!file || !isPaidFileStatus(file.status)) {
      throw new NotFoundError(`File not found: ${cid}`)
    }

    return {
      filename: file.filename,
      sizeBytes: file.sizeBytes,
      content: this.adapters.ipfs.cat({ cid, filename: file.filename })
    }
  }
}

export default FileUseCases

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:20:01.778Z","module_hash":"36f5ce89da66ba403d8225d7f5f63402471df5880f7ce09087a2dec8932a155c","functions":[{"id":"func/FileUseCases.constructor","name":"FileUseCases.constructor","line":18,"end_line":30,"hash":"fcbfdfcd0c78720714d142b131a743dae4a5e11769f4b5a4e71a830428088b41"},{"id":"func/FileUseCases.uploadAndQuote","name":"FileUseCases.uploadAndQuote","line":34,"end_line":92,"hash":"6800d5f69d40183bb885b49502bf12aec50823e41a3c5ba449b6dfb69ecd62f4"},{"id":"func/FileUseCases.existingQuote","name":"FileUseCases.existingQuote","line":97,"end_line":104,"hash":"b98067a4f55a413394df66ec5d743fd72ed5ae2be88f43aad54c373c87cb7a58"},{"id":"func/FileUseCases.getOpenInvoice","name":"FileUseCases.getOpenInvoice","line":108,"end_line":113,"hash":"c4c9abe90c1bd2d4406454fd304d658465ef28903718284d42765160988bdcbd"},{"id":"func/FileUseCases.removeTempFile","name":"FileUseCases.removeTempFile","line":115,"end_line":124,"hash":"2955b0bc902ff54745ded9bf8531b2151dd559c5b5cbb47c06ca02f96ae625f9"},{"id":"func/FileUseCases.toQuote","name":"FileUseCases.toQuote","line":126,"end_line":139,"hash":"777577474c746fd278fc22aed0fd53176031a7fb8316e36b438a5955d2477bf9"},{"id":"func/FileUseCases.alreadyHosted","name":"FileUseCases.alreadyHosted","line":141,"end_line":150,"hash":"9ffd8787e7d1c3b2a457bd5796f1450b76668f3ecb776eefc569fe1ccf53fe17"},{"id":"func/FileUseCases.links","name":"FileUseCases.links","line":152,"end_line":159,"hash":"b7e4b19e2c087302e653b6275ccef71731a4eb0d9553c4147a2661d291bf900b"},{"id":"func/FileUseCases.getFileStatus","name":"FileUseCases.getFileStatus","line":161,"end_line":174,"hash":"6bf37c8517c15163f75444728f997dc0985672702861ad9adca6f6fc7394c6ea"},{"id":"func/FileUseCases.getDownload","name":"FileUseCases.getDownload","line":177,"end_line":188,"hash":"491a06d429ced520c2694129a47e37d1c3a854882ce4fe4574546a707a485458"}]}
// mutate4javascript-manifest-end
