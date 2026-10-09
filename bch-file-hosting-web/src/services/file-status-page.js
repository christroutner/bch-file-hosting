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

'use strict'

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
