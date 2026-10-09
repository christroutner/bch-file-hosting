/*
  Page-controller service for the file-hosting upload view.

  The service owns the page's display state. It turns a chosen browser file and
  the hosting API response into one of these states:

    no-file   the visitor submitted the form without choosing a file
    quote     the API returned a price and a payment address
    hosted    the API reported the file is already hosted (download link)
    paid      check-payment reported the quote paid (CID, links, transaction)
    expired   the quote expired before the payment was confirmed
    pending   the payment was never confirmed within the polling window
    error     the upload or the wallet payment was rejected

  It also pays an open quote from the injected wallet and polls check-payment
  until the payment is confirmed. `now` and `sleep` are injected so the state
  transitions are deterministic and testable. The state is a plain view model
  that the presentational component and the acceptance run can render without
  a browser.
*/

'use strict'

const { formatCountdown } = require('./quote-countdown')

const NO_FILE_MESSAGE = 'Choose a file to upload.'
const GENERIC_ERROR_MESSAGE = 'Upload failed'
const EXPIRED_MESSAGE = 'This quote has expired.'
const PENDING_MESSAGE = 'Payment not confirmed.'
const DEFAULT_CONFIRMATION_ATTEMPTS = 10
const DEFAULT_POLL_DELAY_MS = 3000

function quoteState (response, filename, now) {
  const state = {
    status: 'quote',
    filename: response.filename || filename,
    priceSats: Number(response.priceSats),
    paymentAddress: response.paymentAddress
  }

  // A quote that carries an expiry gets a stable countdown label. Quotes
  // without one (for example an already-hosted response) render no countdown.
  if (response.quoteExpiresAt) {
    state.quoteExpiresAt = response.quoteExpiresAt
    state.countdown = formatCountdown(Date.parse(response.quoteExpiresAt) - now)
  }

  return state
}

function hostedState (response, filename) {
  return {
    status: 'hosted',
    filename: response.filename || filename,
    downloadUrl: response.downloadUrl
  }
}

function paidState (response, txid) {
  return {
    status: 'paid',
    filename: response.filename,
    cid: response.cid,
    downloadUrl: response.downloadUrl,
    gatewayUrls: response.gatewayUrls || [],
    txid
  }
}

// Map a successful API response to the page state. An already-hosted file has
// no new quote; everything else is a fresh quote.
function resultState (response, filename, now) {
  if (response && response.alreadyHosted) return hostedState(response, filename)
  return quoteState(response, filename, now)
}

function errorState (err, filename) {
  const message = err && err.message ? err.message : GENERIC_ERROR_MESSAGE
  return { status: 'error', filename, message }
}

// A wallet payment must yield a non-empty transaction id; anything else is a
// wallet failure and is surfaced as the page error state.
function requireTxid (txid) {
  if (typeof txid !== 'string' || !txid) {
    throw new Error('Unexpected transaction id from wallet')
  }
  return txid
}

class FileUploadPage {
  constructor ({
    hostingApi,
    wallet,
    now = Date.now,
    sleep,
    maxConfirmations = DEFAULT_CONFIRMATION_ATTEMPTS,
    pollDelayMs = DEFAULT_POLL_DELAY_MS
  } = {}) {
    if (!hostingApi) throw new Error('FileUploadPage requires a hosting API adapter')

    this.hostingApi = hostingApi
    this.wallet = wallet
    this.now = now
    this.sleep = sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.maxConfirmations = maxConfirmations
    this.pollDelayMs = pollDelayMs
    this.state = { status: 'idle' }
    this.quote = null
    this.txid = null

    this.upload = this.upload.bind(this)
    this.payFromWallet = this.payFromWallet.bind(this)
    this.waitForConfirmation = this.waitForConfirmation.bind(this)
    this.getViewModel = this.getViewModel.bind(this)
  }

  // Upload a browser File (or null when no file was chosen) and resolve to the
  // page display state.
  async upload (file) {
    if (!file) {
      this.state = { status: 'no-file', message: NO_FILE_MESSAGE }
      this.quote = null
      return this.state
    }

    try {
      const response = await this.hostingApi.upload(file)
      this.state = resultState(response, file.name, this.now())
    } catch (err) {
      this.state = errorState(err, file.name)
    }

    this.quote = this.state.status === 'quote' ? this.state : null
    return this.state
  }

  // Pay the open quote from the browser wallet. Returns the transaction id, or
  // null (leaving the error state) when the wallet rejects the payment.
  async payFromWallet () {
    if (!this.wallet) throw new Error('FileUploadPage requires a wallet to pay')
    if (!this.quote) throw new Error('There is no open quote to pay')

    try {
      this.txid = requireTxid(await this.wallet.send({
        address: this.quote.paymentAddress,
        amountSats: this.quote.priceSats
      }))
      return this.txid
    } catch (err) {
      this.state = errorState(err, this.quote.filename)
      return null
    }
  }

  // Poll check-payment until it reports paid or expired. If it never confirms
  // within the polling window, the page shows the pending message.
  async waitForConfirmation () {
    if (!this.quote) throw new Error('There is no open quote to confirm')

    for (let attempt = 0; attempt < this.maxConfirmations; attempt++) {
      const result = await this.hostingApi.checkPayment({ paymentAddress: this.quote.paymentAddress })

      if (result.status === 'paid') {
        this.state = paidState(result, this.txid)
        return this.state
      }

      if (result.status === 'expired') {
        this.state = { status: 'expired', message: EXPIRED_MESSAGE }
        return this.state
      }

      if (attempt < this.maxConfirmations - 1) await this.sleep(this.pollDelayMs)
    }

    this.state = { status: 'pending', message: PENDING_MESSAGE }
    return this.state
  }

  getViewModel () {
    return this.state
  }
}

module.exports = FileUploadPage
module.exports.NO_FILE_MESSAGE = NO_FILE_MESSAGE
module.exports.EXPIRED_MESSAGE = EXPIRED_MESSAGE
module.exports.PENDING_MESSAGE = PENDING_MESSAGE

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T15:20:24.760Z","module_hash":"920dca75ceb220e625aff277f442fd8bcbd10c312e92d734930516d727e89c5c","functions":[{"id":"func/quoteState","name":"quoteState","line":33,"end_line":49,"hash":"678884d3279e9b3b81d3fbec579c3e87a43134e721291221e0909b5c664b352e"},{"id":"func/hostedState","name":"hostedState","line":51,"end_line":57,"hash":"07848c8fc495ca74ea9d417273f7c1e26285f3caad5dc417a14c1bcaf105bfaa"},{"id":"func/paidState","name":"paidState","line":59,"end_line":68,"hash":"fd78a12828a181d0abf25dac5cfb8aba4adccdae9475a8f70ffc8c3a9d98f64a"},{"id":"func/resultState","name":"resultState","line":72,"end_line":75,"hash":"93e080e3b4517367db4362723299269529e819833e62ca38e6ae7995097d8912"},{"id":"func/errorState","name":"errorState","line":77,"end_line":80,"hash":"5806a3b7064e02c46a89d8ce9ed52311986fda2817c986f8c19259f4bb30827d"},{"id":"func/requireTxid","name":"requireTxid","line":84,"end_line":89,"hash":"dd9c457c0362c47badd786d7e4f030810daf7eade7b39e973fc9c26462dd952f"},{"id":"func/FileUploadPage.constructor","name":"FileUploadPage.constructor","line":92,"end_line":116,"hash":"3dce1931388fe65c1fa71ce48ace8d0d9d887d159ce0ab7c30bcc50cb0f556b7"},{"id":"func/FileUploadPage.upload","name":"FileUploadPage.upload","line":120,"end_line":136,"hash":"331e30dace00e4d770b8487e5a124f5b382a4aa0b7f12564e027a1255e1a1d43"},{"id":"func/FileUploadPage.payFromWallet","name":"FileUploadPage.payFromWallet","line":140,"end_line":154,"hash":"4a01867b1fede36898e411e45c03339b7b2e60109df0ee1c3b37ccea3f6fafc9"},{"id":"func/FileUploadPage.waitForConfirmation","name":"FileUploadPage.waitForConfirmation","line":158,"end_line":179,"hash":"52a6e71933cc599cd14e49eb34df8aaa89e7149ec8dc3a6c0b74cb25749aa61a"},{"id":"func/FileUploadPage.getViewModel","name":"FileUploadPage.getViewModel","line":181,"end_line":183,"hash":"d79cf84c13b8df722e7d9e622b42f98158c05ad037c02781acf9f39ea3011a95"}]}
// mutate4javascript-manifest-end
