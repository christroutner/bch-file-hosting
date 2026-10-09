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
      const txid = await this.wallet.send({
        address: this.quote.paymentAddress,
        amountSats: this.quote.priceSats
      })
      if (typeof txid !== 'string' || !txid) {
        throw new Error('Unexpected transaction id from wallet')
      }
      this.txid = txid
      return txid
    } catch (err) {
      const message = err && err.message ? err.message : GENERIC_ERROR_MESSAGE
      this.state = { status: 'error', filename: this.quote.filename, message }
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
// {"version":1,"tested_at":"2026-10-09T14:46:23.429Z","module_hash":"2ee8a092c80b8ecea7b351c77507bfb66d3ee1158f25dfafe926d290512df85a","functions":[{"id":"func/quoteState","name":"quoteState","line":21,"end_line":28,"hash":"366b7971961e118050dfe5ec15f161aaa83c9fcfa38514b5dab80cc49eb21dcc"},{"id":"func/hostedState","name":"hostedState","line":30,"end_line":36,"hash":"07848c8fc495ca74ea9d417273f7c1e26285f3caad5dc417a14c1bcaf105bfaa"},{"id":"func/resultState","name":"resultState","line":40,"end_line":43,"hash":"1cd6156f35e523fad5b0b9ba65e0194ed929be1ea66ee2ae74e5d1167b6ce0af"},{"id":"func/errorState","name":"errorState","line":45,"end_line":48,"hash":"5806a3b7064e02c46a89d8ce9ed52311986fda2817c986f8c19259f4bb30827d"},{"id":"func/FileUploadPage.constructor","name":"FileUploadPage.constructor","line":51,"end_line":59,"hash":"b8e0b8c31c3bb818bb6e1b9c2d35382f1930085884ec93533b3d96d6fe72b451"},{"id":"func/FileUploadPage.upload","name":"FileUploadPage.upload","line":63,"end_line":77,"hash":"59fd0c13325071d72461b9049ad1e92228f069f235be1c464c074d8cba409a3c"},{"id":"func/FileUploadPage.getViewModel","name":"FileUploadPage.getViewModel","line":79,"end_line":81,"hash":"d79cf84c13b8df722e7d9e622b42f98158c05ad037c02781acf9f39ea3011a95"}]}
// mutate4javascript-manifest-end
