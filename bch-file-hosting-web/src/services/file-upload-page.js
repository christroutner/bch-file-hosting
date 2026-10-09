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

const { formatCountdown } = require('./quote-countdown')
const { failureMessage } = require('./errors')

const NO_FILE_MESSAGE = 'Choose a file to upload.'
const GENERIC_ERROR_MESSAGE = 'Upload failed'
const EXPIRED_MESSAGE = 'This quote has expired.'
const PENDING_MESSAGE = 'Payment not confirmed.'
const DEFAULT_CONFIRMATION_ATTEMPTS = 10
const DEFAULT_POLL_DELAY_MS = 3000

// Normalize an optional byte count from the API. `undefined` and `null` mean
// "not reported"; any other value is coerced to a number so the view model
// carries only numbers.
function optionalNumber (value) {
  if (value === undefined || value === null) return undefined
  return Number(value)
}

function quoteState (response, filename, now) {
  const state = {
    status: 'quote',
    filename: response.filename || filename,
    priceSats: Number(response.priceSats),
    paymentAddress: response.paymentAddress
  }

  // The API reports the selected file size and the billed size separately. A
  // size is kept only when the API reported it; the view shows a separate
  // billed line only when billing rounded the size up.
  const sizeBytes = optionalNumber(response.sizeBytes)
  if (sizeBytes !== undefined) state.sizeBytes = sizeBytes
  const billedBytes = optionalNumber(response.billedBytes)
  if (billedBytes !== undefined) state.billedBytes = billedBytes

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
  return { status: 'error', filename, message: failureMessage(err, GENERIC_ERROR_MESSAGE) }
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

  // One poll of check-payment. Resolves to a terminal state when the check
  // reports paid or expired, or rejects, and to null when the payment is not
  // visible yet.
  async pollOnce () {
    let result
    try {
      result = await this.hostingApi.checkPayment({ paymentAddress: this.quote.paymentAddress })
    } catch (err) {
      return errorState(err, this.quote.filename)
    }

    if (result.status === 'paid') return paidState(result, this.txid)
    if (result.status === 'expired') return { status: 'expired', message: EXPIRED_MESSAGE }
    return null
  }

  // Poll check-payment until it reports paid or expired. A rejected check (an
  // HTTP or network error) shows the API error and stops polling. If the
  // payment never confirms within the polling window, the page shows the
  // pending message.
  async waitForConfirmation () {
    if (!this.quote) throw new Error('There is no open quote to confirm')

    for (let attempt = 0; attempt < this.maxConfirmations; attempt++) {
      const terminal = await this.pollOnce()
      if (terminal) {
        this.state = terminal
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
// {"version":1,"tested_at":"2026-10-09T16:25:55.169Z","module_hash":"640d8263b72500f031487404db902cc266c83b1d1d459aada314695b3baa5291","functions":[{"id":"func/optionalNumber","name":"optionalNumber","line":37,"end_line":40,"hash":"b91fc94ff571b1504001535b6ede50002c675746224a431317ba994778b6d01e"},{"id":"func/quoteState","name":"quoteState","line":42,"end_line":66,"hash":"c65928b3356fa9a251992769005d4d81cf5fc96021e2adfb56b2c62de0488c8a"},{"id":"func/hostedState","name":"hostedState","line":68,"end_line":74,"hash":"07848c8fc495ca74ea9d417273f7c1e26285f3caad5dc417a14c1bcaf105bfaa"},{"id":"func/paidState","name":"paidState","line":76,"end_line":85,"hash":"fd78a12828a181d0abf25dac5cfb8aba4adccdae9475a8f70ffc8c3a9d98f64a"},{"id":"func/resultState","name":"resultState","line":89,"end_line":92,"hash":"93e080e3b4517367db4362723299269529e819833e62ca38e6ae7995097d8912"},{"id":"func/errorState","name":"errorState","line":94,"end_line":96,"hash":"7596b9401c2a6b9fce2fb14fb989bce3e097438e09e196a8afd1fd4b8cec50ba"},{"id":"func/requireTxid","name":"requireTxid","line":100,"end_line":105,"hash":"dd9c457c0362c47badd786d7e4f030810daf7eade7b39e973fc9c26462dd952f"},{"id":"func/FileUploadPage.constructor","name":"FileUploadPage.constructor","line":108,"end_line":132,"hash":"3dce1931388fe65c1fa71ce48ace8d0d9d887d159ce0ab7c30bcc50cb0f556b7"},{"id":"func/FileUploadPage.upload","name":"FileUploadPage.upload","line":136,"end_line":152,"hash":"331e30dace00e4d770b8487e5a124f5b382a4aa0b7f12564e027a1255e1a1d43"},{"id":"func/FileUploadPage.payFromWallet","name":"FileUploadPage.payFromWallet","line":156,"end_line":170,"hash":"4a01867b1fede36898e411e45c03339b7b2e60109df0ee1c3b37ccea3f6fafc9"},{"id":"func/FileUploadPage.pollOnce","name":"FileUploadPage.pollOnce","line":175,"end_line":186,"hash":"42f0a92494a083358c4e9f6844dd18aff279b0c4cd4b22849b33e7f182422b94"},{"id":"func/FileUploadPage.waitForConfirmation","name":"FileUploadPage.waitForConfirmation","line":192,"end_line":207,"hash":"6a17891e9181a62ac9ad971202de4cda479d3300a2254eeebbba28d8fb6e72b9"},{"id":"func/FileUploadPage.getViewModel","name":"FileUploadPage.getViewModel","line":209,"end_line":211,"hash":"d79cf84c13b8df722e7d9e622b42f98158c05ad037c02781acf9f39ea3011a95"}]}
// mutate4javascript-manifest-end
