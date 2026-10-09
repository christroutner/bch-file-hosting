/*
  File use-cases: accept an upload and quote a price, report file status, and
  serve paid files for download.
*/

import { unlink } from 'fs/promises'

import FileUpload, { FILE_STATUS, isPaidFileStatus } from '../entities/file-upload.js'
import Invoice, { INVOICE_STATUS } from '../entities/invoice.js'
import { calculatePrice } from './pricing.js'
import { buildLinks } from './links.js'
import { NotFoundError, ValidationError } from './errors.js'

const MS_PER_HOUR = 60 * 60 * 1000

class FileUseCases {
  constructor ({ adapters } = {}) {
    if (!adapters) throw new Error('FileUseCases requires the adapters')
    this.adapters = adapters
    this.config = adapters.config

    this.fileUpload = new FileUpload()
    this.invoice = new Invoice()

    // Encapsulated for unit tests.
    this.unlink = unlink
    this.now = () => new Date()

    this.uploadAndQuote = this.uploadAndQuote.bind(this)
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

      const existing = await localdb.files.get(cid)
      if (existing && isPaidFileStatus(existing.status)) {
        return this.alreadyHosted(existing)
      }
      if (existing && existing.status === FILE_STATUS.STAGED) {
        const openInvoice = await this.getOpenInvoice(existing.paymentAddress)
        if (openInvoice) return this.toQuote(openInvoice)
      }

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
