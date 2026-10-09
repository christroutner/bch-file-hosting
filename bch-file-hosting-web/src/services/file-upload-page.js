/*
  Page-controller service for the file-hosting upload view.

  The service owns the page's display state. It turns a chosen browser file and
  the hosting API response into one of four states:

    no-file  the visitor submitted the form without choosing a file
    quote    the API returned a price and a payment address
    hosted   the API reported the file is already hosted (download link)
    error    the API rejected the upload

  The state is a plain view model, so the presentational component and the
  acceptance run can render it without a browser.
*/

'use strict'

const NO_FILE_MESSAGE = 'Choose a file to upload.'
const GENERIC_ERROR_MESSAGE = 'Upload failed'

function quoteState (response, filename) {
  return {
    status: 'quote',
    filename: response.filename || filename,
    priceSats: Number(response.priceSats),
    paymentAddress: response.paymentAddress
  }
}

function hostedState (response, filename) {
  return {
    status: 'hosted',
    filename: response.filename || filename,
    downloadUrl: response.downloadUrl
  }
}

// Map a successful API response to the page state. An already-hosted file has
// no new quote; everything else is a fresh quote.
function resultState (response, filename) {
  if (response && response.alreadyHosted) return hostedState(response, filename)
  return quoteState(response, filename)
}

function errorState (err, filename) {
  const message = err && err.message ? err.message : GENERIC_ERROR_MESSAGE
  return { status: 'error', filename, message }
}

class FileUploadPage {
  constructor ({ hostingApi } = {}) {
    if (!hostingApi) throw new Error('FileUploadPage requires a hosting API adapter')

    this.hostingApi = hostingApi
    this.state = { status: 'idle' }

    this.upload = this.upload.bind(this)
    this.getViewModel = this.getViewModel.bind(this)
  }

  // Upload a browser File (or null when no file was chosen) and resolve to the
  // page display state.
  async upload (file) {
    if (!file) {
      this.state = { status: 'no-file', message: NO_FILE_MESSAGE }
      return this.state
    }

    try {
      const response = await this.hostingApi.upload(file)
      this.state = resultState(response, file.name)
    } catch (err) {
      this.state = errorState(err, file.name)
    }

    return this.state
  }

  getViewModel () {
    return this.state
  }
}

module.exports = FileUploadPage
module.exports.NO_FILE_MESSAGE = NO_FILE_MESSAGE
module.exports.resultState = resultState
module.exports.errorState = errorState
