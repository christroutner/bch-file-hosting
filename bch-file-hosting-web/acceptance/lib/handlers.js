/*
  Project step handlers for the bch-file-hosting-web acceptance pipeline.

  These handlers connect the Gherkin step text to the real upload page service
  (src/services/file-upload-page.js) and the real presentational component
  (src/components/app-body/file-hosting/upload-quote-view.js). The hosting API
  adapter is replaced with a deterministic fake that returns the response (or
  error) the scenario configured, so the acceptance run is offline.

  Regex matching with placeholder-name capture is the default style: one
  handler captures the placeholder name (e.g. <api_sats>) and fetches the
  example value from the current scenario example store.
*/

'use strict'

const React = require('react')
const ReactDOMServer = require('react-dom/server')

const FileUploadPage = require('../../src/services/file-upload-page')
const UploadQuoteView = require('../../src/components/app-body/file-hosting/upload-quote-view')

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

// A world/state object is created fresh for every scenario execution.
function createWorld () {
  return {
    page: null,
    response: null,
    error: null,
    state: null,
    html: null
  }
}

// Fake hosting API: returns the configured response or throws the configured
// error. The real FileUploadPage service drives it, so the handler exercises
// the production state machine.
function makeHostingApi (world) {
  return {
    upload: async () => {
      if (world.error) throw new Error(world.error)
      return world.response
    }
  }
}

// Render the current page state once, through the same component the browser
// uses, and cache the static HTML.
function renderPage (world) {
  if (world.state === null) {
    throw new Error('No upload has happened yet.')
  }
  if (world.html === null) {
    world.html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(UploadQuoteView, { state: world.state })
    )
  }
  return world.html
}

// Visible text of a rendered HTML string, for message assertions.
function visibleText (html) {
  return html.replace(/<[^>]+>/g, '')
}

const handlers = [
  {
    name: 'a fresh file hosting web page',
    pattern: /^a fresh file hosting web page$/,
    run (m, example, world) {
      world.response = null
      world.error = null
      world.state = null
      world.html = null
      world.page = new FileUploadPage({ hostingApi: makeHostingApi(world) })
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
    name: 'the visitor uploads a file',
    pattern: /^the visitor uploads the file (<[A-Za-z0-9_]+>)$/,
    async run (m, example, world) {
      const name = resolveParam(m[1], example)
      world.state = await world.page.upload({ name })
      world.html = null
    }
  },
  {
    name: 'the visitor uploads no file',
    pattern: /^the visitor uploads no file$/,
    async run (m, example, world) {
      world.state = await world.page.upload(null)
      world.html = null
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
