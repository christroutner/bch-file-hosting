/*
  Page-controller service for the hosted-files dashboard.

  The service owns the dashboard display state. It loads the public feed from
  the hosting API, shows every file in feed order with its details and pins,
  and supports two actions: Refresh (reload the first page) and Load more
  (append the next page). It keeps no browser storage and does not poll.

  The state is a plain view model that the presentational component and the
  acceptance run can render without a browser.
*/

const { failureMessage } = require('./errors')

const DEFAULT_PAGE_SIZE = 20
const GENERIC_ERROR_MESSAGE = 'Could not load the hosted files'
const EMPTY_MESSAGE = 'No files are hosted yet.'

// Build the download URL for a file from the API base URL.
function downloadUrl (base, cid) {
  return `${String(base).replace(/\/+$/, '')}/download/${cid}`
}

// Keep only the fields the dashboard shows.
function toDashboardFile (file, downloadBaseUrl) {
  return {
    cid: file.cid,
    filename: file.filename,
    sizeBytes: file.sizeBytes,
    status: file.status,
    paymentAddress: file.paymentAddress,
    paidAt: file.paidAt,
    hostedUntil: file.hostedUntil,
    downloadUrl: downloadUrl(downloadBaseUrl, file.cid),
    pins: (file.pins || []).map((pin) => ({ provider: pin.provider, status: pin.status }))
  }
}

function pageState (files, nextCursor) {
  return {
    status: 'loaded',
    files,
    hasMore: Boolean(nextCursor)
  }
}

class DashboardPage {
  constructor ({ hostingApi, pageSize = DEFAULT_PAGE_SIZE, downloadBaseUrl = '' } = {}) {
    if (!hostingApi) throw new Error('DashboardPage requires a hosting API adapter')

    this.hostingApi = hostingApi
    this.pageSize = pageSize
    this.downloadBaseUrl = downloadBaseUrl
    this.state = { status: 'idle' }
    this.cursor = null

    this.load = this.load.bind(this)
    this.loadMore = this.loadMore.bind(this)
    this.getViewModel = this.getViewModel.bind(this)
  }

  // Load (or reload) the first page of the feed.
  async load () {
    try {
      const page = await this.hostingApi.getFeed({ limit: this.pageSize })
      this.cursor = page.nextCursor || null
      this.state = pageState(
        (page.files || []).map((file) => toDashboardFile(file, this.downloadBaseUrl)),
        this.cursor
      )
    } catch (err) {
      this.cursor = null
      this.state = { status: 'error', message: failureMessage(err, GENERIC_ERROR_MESSAGE) }
    }

    return this.state
  }

  // Append the next page of the feed to the files already shown.
  async loadMore () {
    if (this.state.status !== 'loaded' || !this.cursor) return this.state

    try {
      const page = await this.hostingApi.getFeed({ limit: this.pageSize, cursor: this.cursor })
      this.cursor = page.nextCursor || null
      this.state = pageState(
        [
          ...this.state.files,
          ...(page.files || []).map((file) => toDashboardFile(file, this.downloadBaseUrl))
        ],
        this.cursor
      )
    } catch (err) {
      this.state = { status: 'error', message: failureMessage(err, GENERIC_ERROR_MESSAGE) }
    }

    return this.state
  }

  getViewModel () {
    return this.state
  }
}

module.exports = DashboardPage
module.exports.DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE
module.exports.EMPTY_MESSAGE = EMPTY_MESSAGE

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T20:22:32.401Z","module_hash":"7178fab56de0798dcbf2f07fe7883ee54a7344b63ce09ea6de72c00046407cd0","functions":[{"id":"func/toDashboardFile","name":"toDashboardFile","line":20,"end_line":31,"hash":"6e99d76f2389a6c65da0c581135ce0343cf155fcf47f735161b7e60f802e00f2"},{"id":"func/pageState","name":"pageState","line":33,"end_line":39,"hash":"52a12d4cbc460683dcd79787de9802aa33fe3c9a3c9b0db2efbd263baf9f69f9"},{"id":"func/DashboardPage.constructor","name":"DashboardPage.constructor","line":42,"end_line":53,"hash":"e2680021b329ba7f8327b98d5987768bff01135f8e1fb89dd5de67a4d994a371"},{"id":"func/DashboardPage.load","name":"DashboardPage.load","line":56,"end_line":67,"hash":"474e19d9efb3a0f666cb7fa0ff903b5851e78a1dfc06df0ad76cd78fbd19078a"},{"id":"func/DashboardPage.loadMore","name":"DashboardPage.loadMore","line":70,"end_line":85,"hash":"dc88f54b57edf5d69e0bd1f06079032bae8b69a0df5281527dbd9cccb70aa93a"},{"id":"func/DashboardPage.getViewModel","name":"DashboardPage.getViewModel","line":87,"end_line":89,"hash":"d79cf84c13b8df722e7d9e622b42f98158c05ad037c02781acf9f39ea3011a95"}]}
// mutate4javascript-manifest-end
