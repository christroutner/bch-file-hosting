/*
  Page-controller service for the hosted-files dashboard.

  The service owns the dashboard display state. It loads the public feed from
  the hosting API, shows every file in feed order with its size, times,
  download URL, CID, and a gateway view link, and supports two actions:
  Refresh (reload the first page) and Load more (append the next page). It
  keeps no browser storage and does not poll.

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
    paidAt: file.paidAt,
    hostedUntil: file.hostedUntil,
    downloadUrl: downloadUrl(downloadBaseUrl, file.cid),
    viewUrl: (file.gatewayUrls || [])[0] || ''
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
// {"version":1,"tested_at":"2026-10-10T00:35:15.339Z","module_hash":"c7e834a7118dbb1d96454d20a567c29b85ffa561c0b1520529bab0609194e30a","functions":[{"id":"func/downloadUrl","name":"downloadUrl","line":21,"end_line":23,"hash":"44ebf0f055eaade112f4fb6b4f735c1b42a036e4b179f94541ac1cd76ac08e0d"},{"id":"func/toDashboardFile","name":"toDashboardFile","line":26,"end_line":35,"hash":"0437bd641126aa906ef9a8b49bbed1ffcad0c596410bc43c6321da0a48009707"},{"id":"func/pageState","name":"pageState","line":37,"end_line":43,"hash":"52a12d4cbc460683dcd79787de9802aa33fe3c9a3c9b0db2efbd263baf9f69f9"},{"id":"func/DashboardPage.constructor","name":"DashboardPage.constructor","line":46,"end_line":58,"hash":"a22b49be62a27243e5d49a0bf5ec76a7f5fbc96dcad2b12019ed17f4c340b0e1"},{"id":"func/DashboardPage.load","name":"DashboardPage.load","line":61,"end_line":75,"hash":"9dfd3a85309e8cfe65c2aecfe677c46678993a92724190f965b453b49ee8cb3b"},{"id":"func/DashboardPage.loadMore","name":"DashboardPage.loadMore","line":78,"end_line":96,"hash":"196b047002d1f070fed1093264b48d051b4550a2d0df796878a58b35731ff405"},{"id":"func/DashboardPage.getViewModel","name":"DashboardPage.getViewModel","line":98,"end_line":100,"hash":"d79cf84c13b8df722e7d9e622b42f98158c05ad037c02781acf9f39ea3011a95"}]}
// mutate4javascript-manifest-end
