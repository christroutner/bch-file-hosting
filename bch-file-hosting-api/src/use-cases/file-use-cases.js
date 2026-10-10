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
import { viewType } from './view.js'
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
    this.getView = this.getView.bind(this)
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
      return paginateFeed(files, {
        limit,
        cursor,
        config: this.config,
        providers: this.adapters.pinning.getProviders()
      })
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

  // A file may be served for download or viewing only when it has been paid
  // for and this server still holds a local pin for it.
  async paidPinnedFile (cid) {
    const file = await this.adapters.localdb.files.get(cid)
    if (!file || !isPaidFileStatus(file.status)) {
      throw new NotFoundError(`File not found: ${cid}`)
    }
    if (!(await this.adapters.ipfs.isPinned(cid))) {
      throw new NotFoundError(`File not found: ${cid}`)
    }
    return file
  }

  // Only paid, locally pinned files can be downloaded from this service.
  async getDownload ({ cid }) {
    const file = await this.paidPinnedFile(cid)

    return {
      filename: file.filename,
      sizeBytes: file.sizeBytes,
      content: this.adapters.ipfs.cat({ cid, filename: file.filename })
    }
  }

  // Serve a paid, locally pinned file for inline viewing. Images and videos
  // keep their content type; every other type is downloaded.
  async getView ({ cid }) {
    const file = await this.paidPinnedFile(cid)

    return {
      filename: file.filename,
      sizeBytes: file.sizeBytes,
      content: this.adapters.ipfs.cat({ cid, filename: file.filename }),
      ...viewType(file.filename)
    }
  }
}

export default FileUseCases

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-10T20:14:25.636Z","module_hash":"50a45279e3c9211e663df4d3ed7f2f6835391289328be1ba81b4526de7c22388","functions":[{"id":"func/FileUseCases.constructor","name":"FileUseCases.constructor","line":20,"end_line":34,"hash":"a27b31cce2d7d27fc624e23c4d548f13fecc39ed374bbb80d547a4f6a826874e"},{"id":"func/FileUseCases.uploadAndQuote","name":"FileUseCases.uploadAndQuote","line":38,"end_line":96,"hash":"6800d5f69d40183bb885b49502bf12aec50823e41a3c5ba449b6dfb69ecd62f4"},{"id":"func/FileUseCases.existingQuote","name":"FileUseCases.existingQuote","line":101,"end_line":108,"hash":"b98067a4f55a413394df66ec5d743fd72ed5ae2be88f43aad54c373c87cb7a58"},{"id":"func/FileUseCases.getOpenInvoice","name":"FileUseCases.getOpenInvoice","line":112,"end_line":117,"hash":"c4c9abe90c1bd2d4406454fd304d658465ef28903718284d42765160988bdcbd"},{"id":"func/FileUseCases.removeTempFile","name":"FileUseCases.removeTempFile","line":119,"end_line":128,"hash":"2955b0bc902ff54745ded9bf8531b2151dd559c5b5cbb47c06ca02f96ae625f9"},{"id":"func/FileUseCases.toQuote","name":"FileUseCases.toQuote","line":130,"end_line":143,"hash":"777577474c746fd278fc22aed0fd53176031a7fb8316e36b438a5955d2477bf9"},{"id":"func/FileUseCases.alreadyHosted","name":"FileUseCases.alreadyHosted","line":145,"end_line":154,"hash":"9ffd8787e7d1c3b2a457bd5796f1450b76668f3ecb776eefc569fe1ccf53fe17"},{"id":"func/FileUseCases.links","name":"FileUseCases.links","line":156,"end_line":163,"hash":"b7e4b19e2c087302e653b6275ccef71731a4eb0d9553c4147a2661d291bf900b"},{"id":"func/FileUseCases.listFeed","name":"FileUseCases.listFeed","line":167,"end_line":179,"hash":"abd3bbe4cea487e4387b7993b93a41448133235ae9fc9c28a2ef81c385e051f9"},{"id":"func/FileUseCases.getFileStatus","name":"FileUseCases.getFileStatus","line":181,"end_line":194,"hash":"6bf37c8517c15163f75444728f997dc0985672702861ad9adca6f6fc7394c6ea"},{"id":"func/FileUseCases.paidPinnedFile","name":"FileUseCases.paidPinnedFile","line":198,"end_line":207,"hash":"8a2d61697e625e732ef9a09cbafd042402cbc03d5662533c4a1ad9aaf5de00ad"},{"id":"func/FileUseCases.getDownload","name":"FileUseCases.getDownload","line":210,"end_line":218,"hash":"0910cb0726383624d59974289a32ce4ad6eafee396b8ad2a581b7bd701f44cd0"},{"id":"func/FileUseCases.getView","name":"FileUseCases.getView","line":222,"end_line":231,"hash":"ae6d6a5e7d9279d972405e66be6a2d9d50d7865aad45447033704dba66b9c006"}]}
// mutate4javascript-manifest-end
