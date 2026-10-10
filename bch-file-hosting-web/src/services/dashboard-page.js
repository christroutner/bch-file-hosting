/*
  Page-controller service for the hosted-files dashboard.

  The service owns the dashboard display state. It loads the public feed from
  the hosting API, shows every file in feed order with its size, times, and
  the API download and view URLs, and supports two actions:
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

// Keep only the fields the dashboard shows. The feed carries the API download
// and view URLs; the configured base is a fallback for a feed that omits the
// download URL.
function toDashboardFile (file, downloadBaseUrl) {
  return {
    cid: file.cid,
    filename: file.filename,
    sizeBytes: file.sizeBytes,
    paidAt: file.paidAt,
    hostedUntil: file.hostedUntil,
    downloadUrl: file.downloadUrl || downloadUrl(downloadBaseUrl, file.cid),
    viewUrl: file.viewUrl || ''
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
// {"version":1,"tested_at":"2026-10-10T20:15:15.109Z","module_hash":"731a0335a5d6fc19618be300b5279c8ec0e8a2b4664b5b75441a5c92e29d3bdd","functions":[{"id":"func/downloadUrl","name":"downloadUrl","line":21,"end_line":23,"hash":"44ebf0f055eaade112f4fb6b4f735c1b42a036e4b179f94541ac1cd76ac08e0d"},{"id":"func/toDashboardFile","name":"toDashboardFile","line":28,"end_line":38,"hash":"11a831bc18963b9a1fb5f38142705b7aeca0b27fc602da598fbbc911ae392bab"},{"id":"func/pageState","name":"pageState","line":40,"end_line":46,"hash":"52a12d4cbc460683dcd79787de9802aa33fe3c9a3c9b0db2efbd263baf9f69f9"},{"id":"func/DashboardPage.constructor","name":"DashboardPage.constructor","line":49,"end_line":61,"hash":"a22b49be62a27243e5d49a0bf5ec76a7f5fbc96dcad2b12019ed17f4c340b0e1"},{"id":"func/DashboardPage.load","name":"DashboardPage.load","line":64,"end_line":78,"hash":"9dfd3a85309e8cfe65c2aecfe677c46678993a92724190f965b453b49ee8cb3b"},{"id":"func/DashboardPage.loadMore","name":"DashboardPage.loadMore","line":81,"end_line":99,"hash":"196b047002d1f070fed1093264b48d051b4550a2d0df796878a58b35731ff405"},{"id":"func/DashboardPage.getViewModel","name":"DashboardPage.getViewModel","line":101,"end_line":103,"hash":"d79cf84c13b8df722e7d9e622b42f98158c05ad037c02781acf9f39ea3011a95"}]}
// mutate4javascript-manifest-end
