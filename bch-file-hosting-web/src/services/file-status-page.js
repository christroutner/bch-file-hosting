/*
  Page-controller service for the file status view.

  The service owns the status page display state. It turns a typed CID and the
  hosting API's file record into one of these states:

    no-cid  the visitor submitted the form without a CID
    found   the API returned the file record (details, hosting window, pins)
    error   the API rejected the lookup

  The state is a plain view model that the presentational component and the
  acceptance run can render without a browser.
*/

const { failureMessage } = require('./errors')

const NO_CID_MESSAGE = 'Enter a CID to look up.'
const GENERIC_ERROR_MESSAGE = 'Status lookup failed'
const NOT_PAID_LABEL = 'not paid'

// Map a file record to the status display state. An unpaid (staged) file has
// no hosting window yet, so it reads as "not paid".
function foundState (file) {
  return {
    status: 'found',
    cid: file.cid,
    filename: file.filename,
    sizeBytes: file.sizeBytes,
    fileStatus: file.status,
    hostedUntil: file.hostedUntil || NOT_PAID_LABEL,
    pins: (file.pins || []).map((pin) => ({ provider: pin.provider, status: pin.status }))
  }
}

class FileStatusPage {
  constructor ({ hostingApi } = {}) {
    if (!hostingApi) throw new Error('FileStatusPage requires a hosting API adapter')

    this.hostingApi = hostingApi
    this.state = { status: 'idle' }

    this.lookup = this.lookup.bind(this)
    this.getViewModel = this.getViewModel.bind(this)
  }

  // Look up a CID (a blank value asks the visitor to enter one) and resolve to
  // the status display state.
  async lookup (cid) {
    const trimmed = cid == null ? '' : String(cid).trim()

    if (!trimmed) {
      this.state = { status: 'no-cid', message: NO_CID_MESSAGE }
      return this.state
    }

    try {
      const file = await this.hostingApi.getStatus({ cid: trimmed })
      this.state = foundState(file)
    } catch (err) {
      this.state = { status: 'error', message: failureMessage(err, GENERIC_ERROR_MESSAGE) }
    }

    return this.state
  }

  getViewModel () {
    return this.state
  }
}

module.exports = FileStatusPage
module.exports.NO_CID_MESSAGE = NO_CID_MESSAGE

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T20:22:43.851Z","module_hash":"f46e697724c884e5d6c83b36639c4ea062a1eebbec156b336c4ec21203beb9a6","functions":[{"id":"func/foundState","name":"foundState","line":23,"end_line":33,"hash":"9a248d00754fa3e7fc0793ff803bc40453ae08846704055c613524b29df0da6f"},{"id":"func/FileStatusPage.constructor","name":"FileStatusPage.constructor","line":36,"end_line":44,"hash":"b4dc94abb72a2583458f81fd043ce9e083e03e95bad9db1847ba91a0b767bcbd"},{"id":"func/FileStatusPage.lookup","name":"FileStatusPage.lookup","line":48,"end_line":64,"hash":"67961487854016024b61815f9546a9fb00aaba3f7b5f7ff2c4f5fe4422feb2fd"},{"id":"func/FileStatusPage.getViewModel","name":"FileStatusPage.getViewModel","line":66,"end_line":68,"hash":"d79cf84c13b8df722e7d9e622b42f98158c05ad037c02781acf9f39ea3011a95"}]}
// mutate4javascript-manifest-end
