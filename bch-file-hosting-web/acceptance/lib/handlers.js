/*
  Project step handlers for the bch-file-hosting-web acceptance pipeline.

  These handlers connect the Gherkin step text to the real page service
  (src/services/file-upload-page.js) and the real presentational component
  (src/components/app-body/file-hosting/upload-quote-view.js). The hosting API
  adapter and the wallet are replaced with deterministic fakes that return the
  response (or error) the scenario configured, so the acceptance run is
  offline. The page clock and sleep are injected too, so countdowns and polling
  are deterministic.

  Regex matching with placeholder-name capture is the default style: one
  handler captures the placeholder name (e.g. <api_sats>) and fetches the
  example value from the current scenario example store.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')

const FileUploadPage = require('../../src/services/file-upload-page')
const FileStatusPage = require('../../src/services/file-status-page')
const DashboardPage = require('../../src/services/dashboard-page')
const HostingApi = require('../../src/services/hosting-api')
const UploadQuoteView = require('../../src/components/app-body/file-hosting/upload-quote-view')
const FileStatusView = require('../../src/components/app-body/file-status/file-status-view')
const DashboardView = require('../../src/components/app-body/dashboard/dashboard-view')

const MINUTE_MS = 60 * 1000

// A fixed clock keeps the countdown and quote-expiry steps deterministic.
const FIXED_NOW = Date.parse('2026-10-09T12:00:00Z')

// Resolve a step value that is a <parameter> placeholder against the example
// store. Literal values pass through.
function resolveParam (value, example) {
  const match = /^<([A-Za-z0-9_]+)>$/.exec(String(value).trim())
  if (match) {
    const param = match[1]
    if (!(param in example)) {
      throw new Error(`Missing example value for "${param}"`)
    }
    return example[param]
  }
  return String(value).trim()
}

// Read a named example value, for patterns that capture the name inside the
// <brackets> rather than the whole placeholder.
function exampleValue (example, name) {
  if (!(name in example)) {
    throw new Error(`Missing example value for "${name}"`)
  }
  return example[name]
}

// A world/state object is created fresh for every scenario execution.
function createWorld () {
  return {
    now: () => FIXED_NOW,
    view: 'upload',
    page: null,
    statusPage: null,
    response: null,
    error: null,
    state: null,
    html: null,
    statusFile: null,
    statusError: null,
    feedFiles: [],
    feedNextPageFiles: [],
    feedNextCursor: null,
    feedNextPageCursor: null,
    feedError: null,
    dashboardPage: null,
    dashboardState: null,
    walletSends: [],
    walletTxid: null,
    walletError: null,
    checkError: null,
    checkResults: [],
    pendingPaid: null,
    browserTransport: null
  }
}

// Fake hosting API: upload returns the configured response or throws the
// configured error; check-payment returns the configured results in order,
// repeating the last one. The real FileUploadPage service drives both, so the
// handlers exercise the production state machine.
function makeHostingApi (world) {
  let checkIndex = 0
  return {
    upload: async () => {
      if (world.error) throw new Error(world.error)
      return world.response
    },
    checkPayment: async () => {
      if (world.checkError) throw new Error(world.checkError)
      if (world.checkResults.length === 0) return { status: 'unpaid' }
      const index = Math.min(checkIndex, world.checkResults.length - 1)
      checkIndex++
      return world.checkResults[index]
    },
    getStatus: async () => {
      if (world.statusError) throw new Error(world.statusError)
      return world.statusFile
    },
    getFeed: async ({ cursor } = {}) => {
      if (world.feedError) throw new Error(world.feedError)
      if (cursor) {
        return { success: true, files: world.feedNextPageFiles, nextCursor: world.feedNextPageCursor }
      }
      return { success: true, files: world.feedFiles, nextCursor: world.feedNextCursor }
    }
  }
}

// Fake browser wallet: records every send, then returns the configured
// transaction id or throws the configured error.
function makeWallet (world) {
  return {
    send: async ({ address, amountSats }) => {
      world.walletSends.push({ address, amountSats })
      if (world.walletError) throw new Error(world.walletError)
      return world.walletTxid || 'acceptance-txid'
    }
  }
}

// A browser-like global fetch. A real browser's native fetch rejects any
// receiver that is not the global object, so this double enforces the same
// contract: a bare `this.fetch(...)` call by an adapter would throw before any
// request. It records the calls and answers with the configured upload
// response.
function makeBrowserTransport (world) {
  const calls = []
  function browserFetch (url, options) {
    if (this !== globalThis) {
      throw new TypeError("'fetch' called on an object that does not implement interface Window.")
    }
    calls.push({ url, options })
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => world.response
    })
  }
  return { calls, fetch: browserFetch }
}

// Render the current page state once, through the same component the browser
// uses, and cache the static HTML.
function renderPage (world) {
  if (world.state === null) {
    throw new Error('No upload, payment, lookup, or dashboard load has happened yet.')
  }
  if (world.html === null) {
    let Component = UploadQuoteView
    if (world.view === 'status') Component = FileStatusView
    if (world.view === 'dashboard') Component = DashboardView
    world.html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(Component, { state: world.state })
    )
  }
  return world.html
}

// Visible text of a rendered HTML string, for message assertions.
function visibleText (html) {
  return html.replace(/<[^>]+>/g, '')
}

// Find one file in the rendered dashboard state.
function findDashboardFile (world, cid) {
  const file = ((world.state && world.state.files) || []).find((f) => f.cid === cid)
  if (!file) throw new Error(`The dashboard does not show the file ${cid}.`)
  return file
}

function assertDashboardField (world, cid, field, expected, rendered) {
  const file = findDashboardFile(world, cid)
  if (String(file[field]) !== String(expected)) {
    throw new Error(`Expected the dashboard file ${cid} ${field} ${expected}, got ${file[field]}.`)
  }
  if (!renderPage(world).includes(rendered === undefined ? String(expected) : rendered)) {
    throw new Error(`Rendered dashboard does not show ${rendered === undefined ? expected : rendered}.`)
  }
}

// Apply an async page transition and invalidate the cached render.
async function transition (world, action) {
  world.state = await action()
  world.html = null
  return world.state
}

const handlers = [
  {
    name: 'a fresh file hosting web page',
    pattern: /^a fresh file hosting web page$/,
    run (m, example, world) {
      const hostingApi = makeHostingApi(world)
      world.page = new FileUploadPage({
        hostingApi,
        wallet: makeWallet(world),
        now: world.now,
        sleep: async () => {},
        maxConfirmations: 10
      })
      world.statusPage = new FileStatusPage({ hostingApi })
      world.dashboardPage = new DashboardPage({ hostingApi })
    }
  },
  {
    name: 'a hosting web page whose API adapter uses the browser fetch transport',
    pattern: /^a hosting web page whose API adapter uses the browser fetch transport$/,
    run (m, example, world) {
      world.browserTransport = makeBrowserTransport(world)
      globalThis.fetch = world.browserTransport.fetch
      const hostingApi = new HostingApi({ config: { apiUrl: 'http://localhost:5050' } })
      world.page = new FileUploadPage({
        hostingApi,
        wallet: makeWallet(world),
        now: world.now,
        sleep: async () => {},
        maxConfirmations: 10
      })
    }
  },
  {
    name: 'the browser transport replies to the upload',
    pattern: /^the browser transport replies to the upload with (<[A-Za-z0-9_]+>) satoshis at (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.response = {
        alreadyHosted: false,
        priceSats: Number(resolveParam(m[1], example)),
        paymentAddress: resolveParam(m[2], example)
      }
    }
  },
  {
    name: 'the hosting API quotes a price at an address',
    pattern: /^the hosting API quotes (<[A-Za-z0-9_]+>) satoshis at (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.response = {
        alreadyHosted: false,
        priceSats: Number(resolveParam(m[1], example)),
        paymentAddress: resolveParam(m[2], example)
      }
    }
  },
  {
    name: 'the quote expires in N minutes',
    pattern: /^the quote expires in (<[A-Za-z0-9_]+>) minutes$/,
    run (m, example, world) {
      const minutes = Number(resolveParam(m[1], example))
      world.response.quoteExpiresAt = new Date(world.now() + minutes * MINUTE_MS).toISOString()
    }
  },
  {
    name: 'the file is a number of bytes',
    pattern: /^the file is (<[A-Za-z0-9_]+>) bytes$/,
    run (m, example, world) {
      world.response.sizeBytes = Number(resolveParam(m[1], example))
    }
  },
  {
    name: 'the billed size is a number of bytes',
    pattern: /^the billed size is (<[A-Za-z0-9_]+>) bytes$/,
    run (m, example, world) {
      world.response.billedBytes = Number(resolveParam(m[1], example))
    }
  },
  {
    name: 'an open hosting quote',
    pattern: /^an open hosting quote$/,
    async run (m, example, world) {
      world.response = {
        alreadyHosted: false,
        filename: 'upload.bin',
        priceSats: 2000,
        paymentAddress: 'bitcoincash:qopenquote'
      }
      await transition(world, () => world.page.upload({ name: 'upload.bin' }))
    }
  },
  {
    name: 'the hosting API reports the file is already hosted',
    pattern: /^the hosting API reports the file is already hosted at (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.response = {
        alreadyHosted: true,
        downloadUrl: resolveParam(m[1], example)
      }
    }
  },
  {
    name: 'the hosting API rejects the upload',
    pattern: /^the hosting API rejects the upload with error (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.error = resolveParam(m[1], example)
    }
  },
  {
    name: 'the hosting API reports the payment as unpaid',
    pattern: /^the hosting API reports the payment as unpaid$/,
    run (m, example, world) {
      world.checkResults.push({ status: 'unpaid' })
    }
  },
  {
    name: 'the hosting API reports the payment as expired',
    pattern: /^the hosting API reports the payment as expired$/,
    run (m, example, world) {
      world.checkResults.push({ status: 'expired' })
    }
  },
  {
    name: 'the hosting API rejects the payment check',
    pattern: /^the hosting API rejects the payment check with error (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.checkError = resolveParam(m[1], example)
    }
  },
  {
    name: 'the hosting API reports a paid invoice with a CID',
    pattern: /^the hosting API reports a paid invoice with CID (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const paid = {
        status: 'paid',
        cid: resolveParam(m[1], example),
        filename: 'upload.bin',
        downloadUrl: '',
        gatewayUrls: []
      }
      world.pendingPaid = paid
      world.checkResults.push(paid)
    }
  },
  {
    name: 'the hosting API reports the download URL of the paid invoice',
    pattern: /^the hosting API reports the download URL (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.pendingPaid.downloadUrl = resolveParam(m[1], example)
    }
  },
  {
    name: 'the hosting API reports the paid file name',
    pattern: /^the hosting API reports the paid file name (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.pendingPaid.filename = resolveParam(m[1], example)
    }
  },
  {
    name: 'the hosting API reports a gateway URL of the paid invoice',
    pattern: /^the hosting API reports the gateway URL (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.pendingPaid.gatewayUrls.push(resolveParam(m[1], example))
    }
  },
  {
    name: 'the wallet will broadcast a transaction',
    pattern: /^the wallet will broadcast the transaction (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.walletTxid = resolveParam(m[1], example)
    }
  },
  {
    name: 'the browser wallet rejects the payment',
    pattern: /^the browser wallet rejects the payment with error (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.walletError = resolveParam(m[1], example)
    }
  },
  {
    name: 'the visitor uploads a file',
    pattern: /^the visitor uploads a file$/,
    async run (m, example, world) {
      await transition(world, () => world.page.upload({ name: 'upload.bin' }))
    }
  },
  {
    name: 'the visitor uploads a named file',
    pattern: /^the visitor uploads the file (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const name = resolveParam(m[1], example)
      // The real upload adapter builds a FormData body, which only accepts a
      // Blob or File. The browser-transport feature drives the real adapter,
      // so build a real File; the other features use a fake adapter and only
      // need the name.
      const file = world.browserTransport ? new File(['acceptance'], name) : { name }
      await transition(world, () => world.page.upload(file))
    }
  },
  {
    name: 'the visitor uploads no file',
    pattern: /^the visitor uploads no file$/,
    async run (m, example, world) {
      await transition(world, () => world.page.upload(null))
    }
  },
  {
    name: 'the visitor pays the quote from the browser wallet',
    pattern: /^the visitor pays the quote from the browser wallet$/,
    async run (m, example, world) {
      await transition(world, async () => {
        await world.page.payFromWallet()
        return world.page.getViewModel()
      })
    }
  },
  {
    name: 'the visitor waits for the payment to be confirmed',
    pattern: /^the visitor waits for the payment to be confirmed$/,
    async run (m, example, world) {
      await transition(world, () => world.page.waitForConfirmation())
    }
  },
  {
    name: 'the hosting API reports a file with a CID',
    pattern: /^the hosting API reports a file with CID (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.statusFile = { cid: resolveParam(m[1], example), pins: [] }
    }
  },
  {
    name: 'the hosting API reports the file name',
    pattern: /^the hosting API reports the file name (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.statusFile.filename = resolveParam(m[1], example)
    }
  },
  {
    name: 'the hosting API reports the file size',
    pattern: /^the hosting API reports the file size (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.statusFile.sizeBytes = Number(resolveParam(m[1], example))
    }
  },
  {
    name: 'the hosting API reports the file status',
    pattern: /^the hosting API reports the file status (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.statusFile.status = resolveParam(m[1], example)
    }
  },
  {
    name: 'the hosting API reports the hosting window',
    pattern: /^the hosting API reports the hosting window (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.statusFile.hostedUntil = resolveParam(m[1], example)
    }
  },
  {
    name: 'the hosting API reports a pin for a provider',
    pattern: /^the hosting API reports a pin for provider (<[A-Za-z0-9_]+>) with status (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.statusFile.pins.push({
        provider: resolveParam(m[1], example),
        status: resolveParam(m[2], example)
      })
    }
  },
  {
    name: 'the hosting API rejects the status',
    pattern: /^the hosting API rejects the status with error (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.statusError = resolveParam(m[1], example)
    }
  },
  {
    name: 'the visitor looks up a CID',
    pattern: /^the visitor looks up the CID (.+)$/,
    async run (m, example, world) {
      world.view = 'status'
      await transition(world, () => world.statusPage.lookup(m[1]))
    }
  },
  {
    name: 'the visitor looks up no CID',
    pattern: /^the visitor looks up no CID$/,
    async run (m, example, world) {
      world.view = 'status'
      await transition(world, () => world.statusPage.lookup(''))
    }
  },
  {
    name: 'the wallet paid an amount to an address',
    pattern: /^the wallet paid (<[A-Za-z0-9_]+>) satoshis to (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const amount = Number(resolveParam(m[1], example))
      const address = resolveParam(m[2], example)
      const last = world.walletSends[world.walletSends.length - 1]
      if (!last) {
        throw new Error('The wallet did not send a payment.')
      }
      if (last.address !== address) {
        throw new Error(`Expected the wallet to pay ${address}, got ${last.address}.`)
      }
      if (last.amountSats !== amount) {
        throw new Error(`Expected the wallet to pay ${amount} satoshis, got ${last.amountSats}.`)
      }
    }
  },
  {
    name: 'the browser transport received a POST with a file',
    pattern: /^the browser transport received a POST to (<[A-Za-z0-9_]+>) with the file (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expectedUrl = resolveParam(m[1], example)
      const expectedName = resolveParam(m[2], example)
      const calls = (world.browserTransport && world.browserTransport.calls) || []
      const call = calls.find((entry) => entry.options.method === 'POST')
      if (!call) {
        throw new Error('The browser transport did not receive a POST.')
      }
      if (call.url !== expectedUrl) {
        throw new Error(`Expected a POST to ${expectedUrl}, got ${call.url}.`)
      }
      const sent = call.options.body.get('file')
      const sentName = sent && sent.name
      if (sentName !== expectedName) {
        throw new Error(`Expected the POST to carry the file ${expectedName}, got ${sentName}.`)
      }
    }
  },
  {
    name: 'the page shows the file name',
    pattern: /^the page shows the file name (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (world.state.filename !== expected) {
        throw new Error(`Expected the page to show the file name "${expected}", got "${world.state.filename}".`)
      }
      if (!renderPage(world).includes(expected)) {
        throw new Error(`Rendered page does not show the file name "${expected}".`)
      }
    }
  },
  {
    name: 'the page shows the price',
    pattern: /^the page shows the price (<[A-Za-z0-9_]+>) satoshis$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (world.state.status !== 'quote' || String(world.state.priceSats) !== String(expected)) {
        throw new Error(`Expected the page to show a quote of ${expected} satoshis, got ${JSON.stringify(world.state)}.`)
      }
      if (!renderPage(world).includes(`${expected} satoshis`)) {
        throw new Error(`Rendered page does not show the price ${expected} satoshis.`)
      }
    }
  },
  {
    name: 'the page shows the payment address',
    pattern: /^the page shows the payment address (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (world.state.paymentAddress !== expected) {
        throw new Error(`Expected the page to show the payment address ${expected}, got "${world.state.paymentAddress}".`)
      }
      if (!renderPage(world).includes(expected)) {
        throw new Error(`Rendered page does not show the payment address ${expected}.`)
      }
    }
  },
  {
    name: 'the page shows a payment QR code',
    pattern: /^the page shows a payment QR code$/,
    run (m, example, world) {
      const html = renderPage(world)
      if (!html.includes('file-upload-qr') || !html.includes('<svg')) {
        throw new Error('Rendered page does not show a payment QR code.')
      }
    }
  },
  {
    name: 'the page shows a quote countdown',
    pattern: /^the page shows a quote countdown of (.+)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (world.state.countdown !== expected) {
        throw new Error(`Expected the page to show a countdown of "${expected}", got "${world.state.countdown}".`)
      }
      if (!renderPage(world).includes(expected)) {
        throw new Error(`Rendered page does not show the countdown "${expected}".`)
      }
    }
  },
  {
    name: 'the page shows the download URL',
    pattern: /^the page shows the download URL (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (world.state.downloadUrl !== expected) {
        throw new Error(`Expected the page to show the download URL ${expected}, got "${world.state.downloadUrl}".`)
      }
      if (!renderPage(world).includes(expected)) {
        throw new Error(`Rendered page does not show the download URL ${expected}.`)
      }
    }
  },
  {
    name: 'the page shows the CID',
    pattern: /^the page shows the CID (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (world.state.cid !== expected) {
        throw new Error(`Expected the page to show the CID ${expected}, got "${world.state.cid}".`)
      }
      if (!renderPage(world).includes(expected)) {
        throw new Error(`Rendered page does not show the CID ${expected}.`)
      }
    }
  },
  {
    name: 'the page shows the gateway URL',
    pattern: /^the page shows the gateway URL (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (!(world.state.gatewayUrls || []).includes(expected)) {
        throw new Error(`Expected the page to show the gateway URL ${expected}.`)
      }
      if (!renderPage(world).includes(expected)) {
        throw new Error(`Rendered page does not show the gateway URL ${expected}.`)
      }
    }
  },
  {
    name: 'the gateway URL has a link target',
    pattern: /^the gateway URL (<[A-Za-z0-9_]+>) has link target (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const url = resolveParam(m[1], example)
      const expected = resolveParam(m[2], example)
      const anchors = renderPage(world).match(/<a [^>]*>/g) || []
      const anchor = anchors.find((tag) => tag.includes(`href="${url}"`))
      if (!anchor) {
        throw new Error(`Rendered page does not link the gateway URL ${url}.`)
      }
      const opensInNewTab = anchor.includes('target="_blank"')
      if (expected === '_blank' && !opensInNewTab) {
        throw new Error(`Expected the gateway link ${url} to open in a new tab.`)
      }
      if (expected !== '_blank' && opensInNewTab) {
        throw new Error(`Expected the gateway link ${url} to keep the default target.`)
      }
    }
  },
  {
    name: 'the page shows the payment transaction',
    pattern: /^the page shows the payment transaction (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (world.state.txid !== expected) {
        throw new Error(`Expected the page to show the payment transaction ${expected}, got "${world.state.txid}".`)
      }
      if (!renderPage(world).includes(expected)) {
        throw new Error(`Rendered page does not show the payment transaction ${expected}.`)
      }
    }
  },
  {
    name: 'the page shows the file status',
    pattern: /^the page shows the file status (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (world.state.fileStatus !== expected) {
        throw new Error(`Expected the page to show the file status ${expected}, got "${world.state.fileStatus}".`)
      }
      if (!renderPage(world).includes(expected)) {
        throw new Error(`Rendered page does not show the file status ${expected}.`)
      }
    }
  },
  {
    name: 'the page shows the size',
    pattern: /^the page shows the size (<[A-Za-z0-9_]+>) bytes$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (String(world.state.sizeBytes) !== String(expected)) {
        throw new Error(`Expected the page to show the size ${expected} bytes, got "${world.state.sizeBytes}".`)
      }
      if (!renderPage(world).includes(`${expected} bytes`)) {
        throw new Error(`Rendered page does not show the size ${expected} bytes.`)
      }
    }
  },
  {
    name: 'the page shows the billed size',
    pattern: /^the page shows the billed size (<[A-Za-z0-9_]+>) bytes$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (String(world.state.billedBytes) !== String(expected)) {
        throw new Error(`Expected the page to show a billed size of ${expected} bytes, got "${world.state.billedBytes}".`)
      }
      if (!renderPage(world).includes(`${expected} bytes`)) {
        throw new Error(`Rendered page does not show the billed size ${expected} bytes.`)
      }
    }
  },
  {
    name: 'the page shows no billed size',
    pattern: /^the page shows no billed size$/,
    run (m, example, world) {
      if (renderPage(world).includes('file-upload-billed-size')) {
        throw new Error('Rendered page shows a separate billed size.')
      }
    }
  },
  {
    name: 'the page shows the hosting window',
    pattern: /^the page shows the hosting window (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      if (world.state.hostedUntil !== expected) {
        throw new Error(`Expected the page to show the hosting window "${expected}", got "${world.state.hostedUntil}".`)
      }
      if (!renderPage(world).includes(expected)) {
        throw new Error(`Rendered page does not show the hosting window "${expected}".`)
      }
    }
  },
  {
    name: 'the page shows the pin',
    pattern: /^the page shows the pin (<[A-Za-z0-9_]+>) (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const provider = resolveParam(m[1], example)
      const pinStatus = resolveParam(m[2], example)
      const found = (world.state.pins || []).some((pin) => pin.provider === provider && pin.status === pinStatus)
      if (!found) {
        throw new Error(`Expected the page to show a ${provider} pin with status ${pinStatus}.`)
      }
      const html = renderPage(world)
      if (!html.includes(provider) || !html.includes(pinStatus)) {
        throw new Error(`Rendered page does not show the ${provider} pin with status ${pinStatus}.`)
      }
    }
  },
  {
    name: 'the hosting API feed lists a file by placeholders',
    pattern: /^the hosting API feed lists a <([A-Za-z0-9_]+)> file <([A-Za-z0-9_]+)> named <([A-Za-z0-9_]+)> of <([A-Za-z0-9_]+)> bytes paid at <([A-Za-z0-9_]+)> until <([A-Za-z0-9_]+)> at address <([A-Za-z0-9_]+)>$/,
    run (m, example, world) {
      world.feedFiles.push({
        status: exampleValue(example, m[1]),
        cid: exampleValue(example, m[2]),
        filename: exampleValue(example, m[3]),
        sizeBytes: Number(exampleValue(example, m[4])),
        paidAt: exampleValue(example, m[5]),
        hostedUntil: exampleValue(example, m[6]),
        paymentAddress: exampleValue(example, m[7]),
        pins: []
      })
    }
  },
  {
    name: 'the hosting API feed lists a literal file',
    pattern: /^the hosting API feed lists a ([A-Za-z]+) file (\S+) named (\S+) of (\d+) bytes paid at (\S+) until (\S+) at address (\S+)$/,
    run (m, _example, world) {
      world.feedFiles.push({
        status: m[1],
        cid: m[2],
        filename: m[3],
        sizeBytes: Number(m[4]),
        paidAt: m[5],
        hostedUntil: m[6],
        paymentAddress: m[7],
        pins: []
      })
    }
  },
  {
    name: 'the hosting API feed has a next page',
    pattern: /^the hosting API feed has a next page$/,
    run (_m, _example, world) {
      world.feedNextCursor = 'next-feed-cursor'
    }
  },
  {
    name: "the hosting API feed's next page lists a file",
    pattern: /^the hosting API feed's next page lists a ([A-Za-z]+) file (\S+) named (\S+) of (\d+) bytes paid at (\S+) until (\S+) at address (\S+)$/,
    run (m, _example, world) {
      world.feedNextPageFiles.push({
        status: m[1],
        cid: m[2],
        filename: m[3],
        sizeBytes: Number(m[4]),
        paidAt: m[5],
        hostedUntil: m[6],
        paymentAddress: m[7],
        pins: []
      })
    }
  },
  {
    name: 'the hosting API feed is replaced with a file',
    pattern: /^the hosting API feed is replaced with a ([A-Za-z]+) file (\S+) named (\S+) of (\d+) bytes paid at (\S+) until (\S+) at address (\S+)$/,
    run (m, _example, world) {
      world.feedFiles = [{
        status: m[1],
        cid: m[2],
        filename: m[3],
        sizeBytes: Number(m[4]),
        paidAt: m[5],
        hostedUntil: m[6],
        paymentAddress: m[7],
        pins: []
      }]
      world.feedNextCursor = null
      world.feedNextPageFiles = []
      world.feedNextPageCursor = null
      world.feedError = null
    }
  },
  {
    name: 'the hosting API feed lists a pin for a file',
    pattern: /^the hosting API feed lists a <([A-Za-z0-9_]+)> pin <([A-Za-z0-9_]+)> for the file <([A-Za-z0-9_]+)>$/,
    run (m, example, world) {
      const cid = exampleValue(example, m[3])
      const file = world.feedFiles.find((f) => f.cid === cid)
      if (!file) throw new Error(`The hosting API feed does not list the file ${cid}.`)
      file.pins.push({ provider: exampleValue(example, m[1]), status: exampleValue(example, m[2]) })
    }
  },
  {
    name: 'the hosting API rejects the feed',
    pattern: /^the hosting API rejects the feed with error (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      world.feedError = resolveParam(m[1], example)
    }
  },
  {
    name: 'the visitor opens the dashboard',
    pattern: /^the visitor opens the dashboard$/,
    async run (_m, _example, world) {
      world.view = 'dashboard'
      await transition(world, () => world.dashboardPage.load())
    }
  },
  {
    name: 'the visitor loads more of the dashboard',
    pattern: /^the visitor loads more of the dashboard$/,
    async run (_m, _example, world) {
      await transition(world, () => world.dashboardPage.loadMore())
    }
  },
  {
    name: 'the visitor refreshes the dashboard',
    pattern: /^the visitor refreshes the dashboard$/,
    async run (_m, _example, world) {
      await transition(world, () => world.dashboardPage.load())
    }
  },
  {
    name: 'the dashboard lists the file names',
    pattern: /^the dashboard lists the file names (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example).split(',').map((s) => s.trim()).filter(Boolean)
      const actual = ((world.state && world.state.files) || []).map((f) => f.filename)
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected the dashboard to list ${expected.join(',')}, got ${actual.join(',')}.`)
      }
      const html = renderPage(world)
      let last = -1
      for (const name of expected) {
        const at = html.indexOf(name)
        if (at <= last) throw new Error(`Rendered dashboard does not list ${name} in feed order.`)
        last = at
      }
    }
  },
  {
    name: 'the dashboard shows the file name',
    pattern: /^the dashboard shows the file (<[A-Za-z0-9_]+>) named (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      assertDashboardField(world, resolveParam(m[1], example), 'filename', resolveParam(m[2], example))
    }
  },
  {
    name: 'the dashboard shows the file size',
    pattern: /^the dashboard shows the file (<[A-Za-z0-9_]+>) of (<[A-Za-z0-9_]+>) bytes$/,
    run (m, example, world) {
      const size = resolveParam(m[2], example)
      assertDashboardField(world, resolveParam(m[1], example), 'sizeBytes', size, `${size} bytes`)
    }
  },
  {
    name: 'the dashboard shows the file status',
    pattern: /^the dashboard shows the file (<[A-Za-z0-9_]+>) with status (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      assertDashboardField(world, resolveParam(m[1], example), 'status', resolveParam(m[2], example))
    }
  },
  {
    name: 'the dashboard shows the file paid time',
    pattern: /^the dashboard shows the file (<[A-Za-z0-9_]+>) paid at (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      assertDashboardField(world, resolveParam(m[1], example), 'paidAt', resolveParam(m[2], example))
    }
  },
  {
    name: 'the dashboard shows the file hosting window',
    pattern: /^the dashboard shows the file (<[A-Za-z0-9_]+>) until (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      assertDashboardField(world, resolveParam(m[1], example), 'hostedUntil', resolveParam(m[2], example))
    }
  },
  {
    name: 'the dashboard shows the file payment address',
    pattern: /^the dashboard shows the file (<[A-Za-z0-9_]+>) at address (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      assertDashboardField(world, resolveParam(m[1], example), 'paymentAddress', resolveParam(m[2], example))
    }
  },
  {
    name: 'the dashboard shows the pin',
    pattern: /^the dashboard shows the pin (<[A-Za-z0-9_]+>) (<[A-Za-z0-9_]+>)$/,
    run (m, example, world) {
      const provider = resolveParam(m[1], example)
      const pinStatus = resolveParam(m[2], example)
      const files = (world.state && world.state.files) || []
      const found = files.some((f) => (f.pins || []).some((p) => p.provider === provider && p.status === pinStatus))
      if (!found) throw new Error(`Expected the dashboard to show a ${provider} pin with status ${pinStatus}.`)
      const html = renderPage(world)
      if (!html.includes(provider) || !html.includes(pinStatus)) {
        throw new Error(`Rendered dashboard does not show the ${provider} pin with status ${pinStatus}.`)
      }
    }
  },
  {
    name: 'the page shows a message',
    pattern: /^the page shows "(.+)"$/,
    run (m, example, world) {
      const expected = resolveParam(m[1], example)
      const html = renderPage(world)
      if (!visibleText(html).includes(expected)) {
        throw new Error(`Rendered page does not show "${expected}".`)
      }
    }
  }
]

// Route a single step to its handler. Throws on unsupported step text.
async function handleStep (step, example, world) {
  for (const handler of handlers) {
    const match = handler.pattern.exec(step.text)
    if (match) {
      await handler.run(match, example, world, step)
      return
    }
  }
  throw new Error(`Unsupported step: ${step.keyword} ${step.text}`)
}

module.exports = { createWorld, handleStep }
