/*
  Project step handlers for the bch-file-hosting-cli acceptance pipeline.

  Every scenario drives the real FileUpload command with an injected fake
  hosting API and captured output, so command validation, exit codes, and
  output formatting come from production code. Example-table values stay in the
  IR example store; patterns capture the placeholder name so Gherkin soft
  mutation can change one cell without rewriting the step text.
*/

// Global npm libraries
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Local libraries
import FileUpload from '../../src/commands/file-upload.js'
import FileCheck from '../../src/commands/file-check.js'
import FileStatus from '../../src/commands/file-status.js'
import FilePay from '../../src/commands/file-pay.js'
import FileHost from '../../src/commands/file-host.js'
import FileList from '../../src/commands/file-list.js'
import WalletCreate from '../../src/commands/wallet-create.js'
import WalletBalance from '../../src/commands/wallet-balance.js'
import WalletStore from '../../src/lib/wallet-store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Resolve component-local temp files from this module, not the process cwd, so
// acceptance and mutation runs write to the same place regardless of launch dir.
const COMPONENT_ROOT = path.resolve(__dirname, '..', '..')

const FIXTURE_BYTES = 'acceptance file fixture'

function exampleValue (example, name) {
  if (!(name in example)) {
    throw new Error(`Missing example value for "${name}"`)
  }
  return example[name]
}

function asInt (value, label) {
  const n = Number(value)
  if (!Number.isInteger(n)) {
    throw new Error(`${label} is not an integer: ${value}`)
  }
  return n
}

// Resolve a placeholder step token like "<printed_error>" to its example value,
// or return a literal string unchanged.
function expectedText (example, token) {
  const placeholder = /^<([A-Za-z0-9_]+)>$/.exec(token)
  if (placeholder) return exampleValue(example, placeholder[1])
  return token
}

// A public-feed file as the hosting API would report it. `the hosting API feed
// lists the ...` steps fill in the detail fields on the most recently added
// file.
function feedFile (cid, filename) {
  return {
    cid,
    filename,
    sizeBytes: 0,
    status: 'pinned',
    paidAt: null,
    hostedUntil: null,
    downloadUrl: '',
    viewUrl: '',
    pins: []
  }
}

function lastFeedFile (world) {
  return world.feedFiles[world.feedFiles.length - 1]
}

function createWorld () {
  const tmpDir = path.join(COMPONENT_ROOT, 'tmp', 'acceptance')
  fs.mkdirSync(tmpDir, { recursive: true })
  // A fresh wallet directory per scenario keeps stored wallets from leaking
  // between scenarios.
  const walletDir = fs.mkdtempSync(path.join(tmpDir, 'wallets-'))

  const world = {
    tmpDir,
    config: { apiUrl: 'http://localhost:5050' },
    apiResult: null,
    uploadResult: null,
    checkResults: [],
    apiError: null,
    receivedAddress: null,
    receivedCid: null,
    walletTxid: null,
    sentAmount: null,
    sentAddress: null,
    stdout: '',
    stderr: '',
    exitCode: null,
    json: null,
    command: null,
    walletCreateResult: null,
    walletBalance: 0,
    feedFiles: [],
    feedNextPageFiles: [],
    feedNextCursor: null,
    receivedLimit: null,
    receivedCursor: null,
    shownCursor: null
  }

  world.hostingApi = {
    upload: async () => {
      if (world.apiError) throw new Error(world.apiError)
      return world.uploadResult
    },
    checkPayment: async ({ paymentAddress } = {}) => {
      world.receivedAddress = paymentAddress
      if (world.apiError) throw new Error(world.apiError)
      if (world.checkResults.length > 0) return world.checkResults.shift()
      return world.apiResult
    },
    getStatus: async ({ cid } = {}) => {
      world.receivedCid = cid
      if (world.apiError) throw new Error(world.apiError)
      return world.apiResult
    },
    listFiles: async ({ limit, cursor } = {}) => {
      world.receivedLimit = limit
      world.receivedCursor = cursor
      if (world.apiError) throw new Error(world.apiError)
      if (cursor) return { success: true, files: world.feedNextPageFiles, nextCursor: null }
      return { success: true, files: world.feedFiles, nextCursor: world.feedNextCursor }
    }
  }

  world.walletStore = new WalletStore({ dir: walletDir })
  world.walletService = {
    create: async () => world.walletCreateResult,
    balanceSats: async () => world.walletBalance,
    sendSats: async ({ toAddress, amountSats } = {}) => {
      world.sentAddress = toAddress
      world.sentAmount = amountSats
      return world.walletTxid
    }
  }

  return world
}

// Instantiate the command under test with the world's fake dependencies and
// captured output, so every scenario drives production command code.
function buildCommand (world, CommandClass) {
  world.command = new CommandClass({
    config: world.config,
    hostingApi: world.hostingApi,
    walletStore: world.walletStore,
    walletService: world.walletService,
    sleep: async () => {},
    output: (msg) => { world.stdout += `${msg}\n` },
    errorOutput: (msg) => { world.stderr += `${msg}\n` }
  })
}

// Create (or reuse) a real fixture file for an upload path. The scenario's
// `upload_path` is only an input label; the command reads this temp copy.
function fixturePath (world, requestedPath) {
  const target = path.join(world.tmpDir, path.basename(requestedPath))
  if (!fs.existsSync(target)) fs.writeFileSync(target, FIXTURE_BYTES)
  return target
}

async function runUpload (world, requestedPath, extra = {}) {
  world.exitCode = await world.command.run({ file: fixturePath(world, requestedPath), ...extra })
}

const handlers = [
  {
    pattern: /^a file-upload command$/,
    run (_match, _example, world) {
      buildCommand(world, FileUpload)
    }
  },
  {
    pattern: /^a file-check command$/,
    run (_match, _example, world) {
      buildCommand(world, FileCheck)
    }
  },
  {
    pattern: /^a file-status command$/,
    run (_match, _example, world) {
      buildCommand(world, FileStatus)
    }
  },
  {
    pattern: /^a file-list command$/,
    run (_match, _example, world) {
      buildCommand(world, FileList)
    }
  },
  {
    pattern: /^a file-pay command$/,
    run (_match, _example, world) {
      buildCommand(world, FilePay)
    }
  },
  {
    pattern: /^a file-host command$/,
    run (_match, _example, world) {
      buildCommand(world, FileHost)
    }
  },
  {
    pattern: /^a wallet-create command$/,
    run (_match, _example, world) {
      buildCommand(world, WalletCreate)
    }
  },
  {
    pattern: /^a wallet-balance command$/,
    run (_match, _example, world) {
      buildCommand(world, WalletBalance)
    }
  },
  {
    pattern: /^the hosting API quotes <([A-Za-z0-9_]+)> satoshis at <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.uploadResult = world.apiResult = {
        success: true,
        cid: 'bafyquote',
        filename: 'upload.bin',
        sizeBytes: 1024,
        billedBytes: 100000,
        priceSats: asInt(exampleValue(example, match[1]), match[1]),
        paymentAddress: exampleValue(example, match[2]),
        quoteExpiresAt: '2026-10-10T00:00:00.000Z'
      }
    }
  },
  {
    pattern: /^the hosting API reports the file is already hosted at <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.uploadResult = world.apiResult = {
        success: true,
        alreadyHosted: true,
        cid: 'bafyalready',
        downloadUrl: exampleValue(example, match[1])
      }
    }
  },
  {
    pattern: /^the hosting API rejects the upload with error <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiError = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^I run file-upload for the file (.+)$/,
    async run (match, example, world) {
      await runUpload(world, expectedText(example, match[1]))
    }
  },
  {
    pattern: /^I run file-upload with JSON output for the file (.+)$/,
    async run (match, example, world) {
      await runUpload(world, expectedText(example, match[1]), { json: true })
    }
  },
  {
    pattern: /^I run file-upload with no file flag$/,
    async run (_match, _example, world) {
      world.exitCode = await world.command.run({})
    }
  },
  {
    pattern: /^I try file-upload for the missing file (.+)$/,
    async run (match, example, world) {
      const requested = expectedText(example, match[1])
      const missing = path.join(world.tmpDir, path.basename(requested))
      if (fs.existsSync(missing)) fs.rmSync(missing)
      world.exitCode = await world.command.run({ file: missing })
    }
  },
  {
    pattern: /^the exit code is (\d+)$/,
    run (match, _example, world) {
      const expected = asInt(match[1], 'exit code')
      if (world.exitCode !== expected) {
        throw new Error(`expected exit code ${expected}, got ${world.exitCode}`)
      }
    }
  },
  {
    pattern: /^the command prints the price <([A-Za-z0-9_]+)> satoshis$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (!world.stdout.includes(`${expected} satoshis`)) {
        throw new Error(`stdout did not print the price ${expected} satoshis: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the payment address <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(expected)) {
        throw new Error(`stdout did not print the payment address ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the download URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(expected)) {
        throw new Error(`stdout did not print the download URL ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints no payment address$/,
    run (_match, _example, world) {
      if (/payment address/i.test(world.stdout)) {
        throw new Error(`stdout unexpectedly printed a payment address: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^stderr contains "(.+)"$/,
    run (match, example, world) {
      const expected = expectedText(example, match[1])
      if (!world.stderr.includes(expected)) {
        throw new Error(`stderr did not contain ${JSON.stringify(expected)}: ${JSON.stringify(world.stderr)}`)
      }
    }
  },
  {
    pattern: /^stdout is a single JSON object$/,
    run (_match, _example, world) {
      const trimmed = world.stdout.trim()
      if (trimmed.split('\n').length !== 1) {
        throw new Error(`stdout was not a single line: ${JSON.stringify(world.stdout)}`)
      }

      let parsed
      try {
        parsed = JSON.parse(trimmed)
      } catch (err) {
        throw new Error(`stdout was not valid JSON: ${JSON.stringify(world.stdout)}`)
      }

      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`stdout JSON was not an object: ${JSON.stringify(world.stdout)}`)
      }

      world.json = parsed
    }
  },
  {
    pattern: /^the JSON output has the payment address <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.json.paymentAddress !== expected) {
        throw new Error(`expected JSON payment address ${expected}, got ${world.json.paymentAddress}`)
      }
    }
  },
  {
    pattern: /^the JSON output has the price <([A-Za-z0-9_]+)> satoshis$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (world.json.priceSats !== expected) {
        throw new Error(`expected JSON price ${expected} satoshis, got ${world.json.priceSats}`)
      }
    }
  },
  {
    pattern: /^the hosting API reports a paid invoice with CID <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult = {
        success: true,
        status: 'paid',
        cid: exampleValue(example, match[1]),
        gatewayUrls: []
      }
    }
  },
  {
    pattern: /^the hosting API reports the download URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult.downloadUrl = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the hosting API reports the view URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult.viewUrl = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the hosting API reports the gateway URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult.gatewayUrls = [exampleValue(example, match[1])]
    }
  },
  {
    pattern: /^the hosting API reports an unpaid invoice with <([A-Za-z0-9_]+)> received and <([A-Za-z0-9_]+)> required$/,
    run (match, example, world) {
      world.apiResult = {
        success: true,
        status: 'unpaid',
        receivedSats: asInt(exampleValue(example, match[1]), match[1]),
        requiredSats: asInt(exampleValue(example, match[2]), match[2])
      }
    }
  },
  {
    pattern: /^the hosting API reports the payment as unpaid$/,
    run (_match, _example, world) {
      world.apiResult = { success: true, status: 'unpaid', receivedSats: 0, requiredSats: 0 }
      world.checkResults.push(world.apiResult)
    }
  },
  {
    pattern: /^the hosting API reports the quote expiry <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult.quoteExpiresAt = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the hosting API reports an expired invoice$/,
    run (_match, _example, world) {
      world.apiResult = { success: true, status: 'expired' }
    }
  },
  {
    pattern: /^the hosting API rejects the check with error <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiError = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^I run file-check for the address (.+)$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({ address: expectedText(example, match[1]) })
    }
  },
  {
    pattern: /^I run file-check with JSON output for the address (.+)$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({ address: expectedText(example, match[1]), json: true })
    }
  },
  {
    pattern: /^I run file-check with no address$/,
    async run (_match, _example, world) {
      world.exitCode = await world.command.run({})
    }
  },
  {
    pattern: /^the hosting API reports a file with CID <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult = {
        success: true,
        cid: exampleValue(example, match[1]),
        pins: []
      }
    }
  },
  {
    pattern: /^the hosting API reports the file name <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult.filename = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the hosting API reports the file size <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult.sizeBytes = asInt(exampleValue(example, match[1]), match[1])
    }
  },
  {
    pattern: /^the hosting API reports the billed size <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult.billedBytes = asInt(exampleValue(example, match[1]), match[1])
    }
  },
  {
    pattern: /^the hosting API reports the file status <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult.status = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the hosting API reports the hosting window <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult.hostedUntil = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the hosting API reports a pin for provider <([A-Za-z0-9_-]+)> with status <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult.pins.push({
        provider: exampleValue(example, match[1]),
        status: exampleValue(example, match[2])
      })
    }
  },
  {
    pattern: /^the hosting API rejects the status with error <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiError = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^I run file-status for the CID (.+)$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({ cid: expectedText(example, match[1]) })
    }
  },
  {
    pattern: /^I run file-status with no CID$/,
    async run (_match, _example, world) {
      world.exitCode = await world.command.run({})
    }
  },
  {
    pattern: /^I run file-status with JSON output for the CID (.+)$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({ cid: expectedText(example, match[1]), json: true })
    }
  },
  {
    pattern: /^the hosting API received the CID <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.receivedCid !== expected) {
        throw new Error(`expected the hosting API to receive ${expected}, got ${world.receivedCid}`)
      }
    }
  },
  {
    pattern: /^the command prints the file name <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(`File name: ${expected}`)) {
        throw new Error(`stdout did not print the file name ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the size <([A-Za-z0-9_]+)> bytes$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (!world.stdout.includes(`Size: ${expected} bytes`)) {
        throw new Error(`stdout did not print the size ${expected} bytes: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the billed size <([A-Za-z0-9_]+)> bytes$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (!world.stdout.includes(`Billed size: ${expected} bytes`)) {
        throw new Error(`stdout did not print the billed size ${expected} bytes: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints no billed size$/,
    run (_match, _example, world) {
      if (world.stdout.includes('Billed size')) {
        throw new Error(`stdout unexpectedly printed a billed size: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the file status <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(`Status: ${expected}`)) {
        throw new Error(`stdout did not print the file status ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the hosting window <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(`Hosting window: ${expected}`)) {
        throw new Error(`stdout did not print the hosting window ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the pin <([A-Za-z0-9_-]+)> <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const provider = exampleValue(example, match[1])
      const status = exampleValue(example, match[2])
      if (!world.stdout.includes(`Pin: ${provider} ${status}`)) {
        throw new Error(`stdout did not print the pin ${provider} ${status}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the hosting API feed lists a pinned file (\S+) named (\S+)$/,
    run (match, example, world) {
      world.feedFiles.push(feedFile(expectedText(example, match[1]), expectedText(example, match[2])))
    }
  },
  {
    pattern: /^the hosting API feed's next page lists a pinned file (\S+) named (\S+)$/,
    run (match, example, world) {
      world.feedNextPageFiles.push(feedFile(expectedText(example, match[1]), expectedText(example, match[2])))
    }
  },
  {
    pattern: /^the hosting API feed's next page cursor is (\S+)$/,
    run (match, example, world) {
      world.feedNextCursor = expectedText(example, match[1])
    }
  },
  {
    pattern: /^the hosting API feed lists the file size <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      lastFeedFile(world).sizeBytes = asInt(exampleValue(example, match[1]), match[1])
    }
  },
  {
    pattern: /^the hosting API feed lists the paid time <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      lastFeedFile(world).paidAt = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the hosting API feed lists the hosting end <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      lastFeedFile(world).hostedUntil = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the hosting API feed lists the download URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      lastFeedFile(world).downloadUrl = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the hosting API feed lists the view URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      lastFeedFile(world).viewUrl = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the hosting API rejects the feed with error <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiError = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^I run file-list$/,
    async run (_match, _example, world) {
      world.exitCode = await world.command.run({})
    }
  },
  {
    pattern: /^I run file-list with limit <([A-Za-z0-9_]+)>$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({ limit: exampleValue(example, match[1]) })
    }
  },
  {
    pattern: /^I run file-list with JSON output$/,
    async run (_match, _example, world) {
      world.exitCode = await world.command.run({ json: true })
    }
  },
  {
    pattern: /^I run file-list after the next page$/,
    async run (_match, _example, world) {
      world.exitCode = await world.command.run({ cursor: world.shownCursor })
    }
  },
  {
    pattern: /^the hosting API received the limit <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.receivedLimit !== expected) {
        throw new Error(`expected the hosting API to receive limit ${expected}, got ${world.receivedLimit}`)
      }
    }
  },
  {
    pattern: /^the hosting API received the cursor <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.receivedCursor !== expected) {
        throw new Error(`expected the hosting API to receive cursor ${expected}, got ${world.receivedCursor}`)
      }
    }
  },
  {
    pattern: /^the command prints the paid time <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(`Paid: ${expected}`)) {
        throw new Error(`stdout did not print the paid time ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the hosting end <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(`Hosting end: ${expected}`)) {
        throw new Error(`stdout did not print the hosting end ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the view URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(`View URL: ${expected}`)) {
        throw new Error(`stdout did not print the view URL ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the next cursor <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(`Next cursor: ${expected}`)) {
        throw new Error(`stdout did not print the next cursor ${expected}: ${JSON.stringify(world.stdout)}`)
      }
      world.shownCursor = expected
    }
  },
  {
    pattern: /^the command prints the file names <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const names = exampleValue(example, match[1]).split(',').map((name) => name.trim())
      let from = 0
      for (const name of names) {
        const at = world.stdout.indexOf(`File name: ${name}`, from)
        if (at === -1) {
          throw new Error(`stdout did not print the file name ${name} in order: ${JSON.stringify(world.stdout)}`)
        }
        from = at + name.length
      }
    }
  },
  {
    pattern: /^the command prints "(.+)"$/,
    run (match, example, world) {
      const expected = expectedText(example, match[1])
      if (!world.stdout.includes(expected)) {
        throw new Error(`stdout did not print ${JSON.stringify(expected)}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the JSON output lists the CIDs <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1]).split(',').map((cid) => cid.trim())
      const actual = (world.json.files || []).map((file) => file.cid)
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`expected JSON CIDs ${expected.join(',')}, got ${actual.join(',')}`)
      }
    }
  },
  {
    pattern: /^the JSON output has the next cursor <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.json.nextCursor !== expected) {
        throw new Error(`expected JSON next cursor ${expected}, got ${world.json.nextCursor}`)
      }
    }
  },
  {
    pattern: /^the hosting API reports an already paid invoice$/,
    run (_match, _example, world) {
      world.apiResult = { success: true, status: 'paid' }
    }
  },
  {
    pattern: /^the hosting API reports an unpaid invoice$/,
    run (_match, _example, world) {
      world.apiResult = { success: true, status: 'unpaid', receivedSats: 0, requiredSats: 2000 }
    }
  },
  {
    pattern: /^the wallet will broadcast the transaction <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.walletTxid = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^I run file-pay for the address (.+) with the wallet (.+)$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({
        address: expectedText(example, match[1]),
        name: expectedText(example, match[2])
      })
    }
  },
  {
    pattern: /^I run file-pay with the wallet (.+)$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({ name: expectedText(example, match[1]) })
    }
  },
  {
    pattern: /^I run file-pay for the address (.+) with no wallet$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({ address: expectedText(example, match[1]) })
    }
  },
  {
    pattern: /^I run file-pay with JSON output for the address (.+) with the wallet (.+)$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({
        address: expectedText(example, match[1]),
        name: expectedText(example, match[2]),
        json: true
      })
    }
  },
  {
    pattern: /^I run file-host for the file (.+) with the wallet (.+)$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({
        file: fixturePath(world, expectedText(example, match[1])),
        name: expectedText(example, match[2])
      })
    }
  },
  {
    pattern: /^I run file-host with the wallet (.+)$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({ name: expectedText(example, match[1]) })
    }
  },
  {
    pattern: /^I run file-host for the file (.+) with no wallet$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({
        file: fixturePath(world, expectedText(example, match[1]))
      })
    }
  },
  {
    pattern: /^I try file-host for the missing file (.+) with the wallet (.+)$/,
    async run (match, example, world) {
      const requested = expectedText(example, match[1])
      const missing = path.join(world.tmpDir, path.basename(requested))
      if (fs.existsSync(missing)) fs.rmSync(missing)
      world.exitCode = await world.command.run({
        file: missing,
        name: expectedText(example, match[2])
      })
    }
  },
  {
    pattern: /^I run file-host with JSON output for the file (.+) with the wallet (.+)$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({
        file: fixturePath(world, expectedText(example, match[1])),
        name: expectedText(example, match[2]),
        json: true
      })
    }
  },
  {
    pattern: /^the wallet paid <([A-Za-z0-9_]+)> satoshis to <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const amount = asInt(exampleValue(example, match[1]), match[1])
      const address = exampleValue(example, match[2])
      if (world.sentAmount !== amount) {
        throw new Error(`expected the wallet to pay ${amount} satoshis, paid ${world.sentAmount}`)
      }
      if (world.sentAddress !== address) {
        throw new Error(`expected the wallet to pay ${address}, paid ${world.sentAddress}`)
      }
    }
  },
  {
    pattern: /^the wallet made no payment$/,
    run (_match, _example, world) {
      if (world.sentAmount !== null) {
        throw new Error(`expected no payment, but the wallet paid ${world.sentAmount} satoshis`)
      }
    }
  },
  {
    pattern: /^the command prints the amount <([A-Za-z0-9_]+)> satoshis$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (!world.stdout.includes(`Amount: ${expected} satoshis`)) {
        throw new Error(`stdout did not print the amount ${expected} satoshis: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the transaction <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(`Transaction: ${expected}`)) {
        throw new Error(`stdout did not print the transaction ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints already paid$/,
    run (_match, _example, world) {
      if (!/already paid/i.test(world.stdout)) {
        throw new Error(`stdout did not print already paid: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the JSON output has the transaction <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.json.txid !== expected) {
        throw new Error(`expected JSON transaction ${expected}, got ${world.json.txid}`)
      }
    }
  },
  {
    pattern: /^the JSON output has the amount <([A-Za-z0-9_]+)> satoshis$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (world.json.amountSats !== expected) {
        throw new Error(`expected JSON amount ${expected} satoshis, got ${world.json.amountSats}`)
      }
    }
  },
  {
    pattern: /^the hosting API received the address <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.receivedAddress !== expected) {
        throw new Error(`expected the hosting API to receive ${expected}, got ${world.receivedAddress}`)
      }
    }
  },
  {
    pattern: /^the command prints the CID <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(`CID: ${expected}`)) {
        throw new Error(`stdout did not print the CID ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the gateway URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(expected)) {
        throw new Error(`stdout did not print the gateway URL ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the received amount <([A-Za-z0-9_]+)> satoshis$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (!world.stdout.includes(`Received: ${expected} satoshis`)) {
        throw new Error(`stdout did not print the received amount ${expected} satoshis: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the required amount <([A-Za-z0-9_]+)> satoshis$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (!world.stdout.includes(`Required: ${expected} satoshis`)) {
        throw new Error(`stdout did not print the required amount ${expected} satoshis: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the quote expiry <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(`Quote expires: ${expected}`)) {
        throw new Error(`stdout did not print the quote expiry ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the expired status$/,
    run (_match, _example, world) {
      if (!world.stdout.includes('Status: expired')) {
        throw new Error(`stdout did not print the expired status: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the JSON output has the status <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.json.status !== expected) {
        throw new Error(`expected JSON status ${expected}, got ${world.json.status}`)
      }
    }
  },
  {
    pattern: /^the JSON output has the CID <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.json.cid !== expected) {
        throw new Error(`expected JSON CID ${expected}, got ${world.json.cid}`)
      }
    }
  },
  {
    pattern: /^the JSON output has the download URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.json.downloadUrl !== expected) {
        throw new Error(`expected JSON download URL ${expected}, got ${world.json.downloadUrl}`)
      }
    }
  },
  {
    pattern: /^the JSON output has the transaction <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.json.txid !== expected) {
        throw new Error(`expected JSON transaction ${expected}, got ${world.json.txid}`)
      }
    }
  },
  {
    pattern: /^the new wallet has the address <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.walletCreateResult = {
        ...(world.walletCreateResult || {}),
        cashAddress: exampleValue(example, match[1])
      }
    }
  },
  {
    pattern: /^the new wallet has the mnemonic <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.walletCreateResult = {
        ...(world.walletCreateResult || {}),
        mnemonic: exampleValue(example, match[1])
      }
    }
  },
  {
    pattern: /^a wallet named (.+) already exists$/,
    run (match, example, world) {
      const name = expectedText(example, match[1])
      world.walletStore.write(name, { mnemonic: 'existing wallet', cashAddress: 'bitcoincash:qexisting' })
    }
  },
  {
    pattern: /^a wallet named <([A-Za-z0-9_]+)> holds <([A-Za-z0-9_]+)> satoshis$/,
    run (match, example, world) {
      const name = exampleValue(example, match[1])
      world.walletStore.write(name, { mnemonic: 'stored wallet mnemonic', cashAddress: 'bitcoincash:qstored' })
      world.walletBalance = asInt(exampleValue(example, match[2]), match[2])
    }
  },
  {
    pattern: /^no wallet named <([A-Za-z0-9_]+)> exists$/,
    run () {}
  },
  {
    pattern: /^a wallet named <([A-Za-z0-9_]+)> has the mnemonic <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const name = exampleValue(example, match[1])
      world.walletStore.write(name, {
        mnemonic: exampleValue(example, match[2]),
        cashAddress: 'bitcoincash:qstored'
      })
    }
  },
  {
    pattern: /^I run wallet-create for the name <([A-Za-z0-9_]+)>$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({ name: exampleValue(example, match[1]) })
    }
  },
  {
    pattern: /^I run wallet-create with no name$/,
    async run (_match, _example, world) {
      world.exitCode = await world.command.run({})
    }
  },
  {
    pattern: /^I run wallet-balance for the name <([A-Za-z0-9_]+)>$/,
    async run (match, example, world) {
      world.exitCode = await world.command.run({ name: exampleValue(example, match[1]) })
    }
  },
  {
    pattern: /^I run wallet-balance with no name$/,
    async run (_match, _example, world) {
      world.exitCode = await world.command.run({})
    }
  },
  {
    pattern: /^the wallet store contains a wallet named <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const name = exampleValue(example, match[1])
      if (!world.walletStore.has(name)) {
        throw new Error(`expected the wallet store to contain ${name}`)
      }
    }
  },
  {
    pattern: /^the command prints the address <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(expected)) {
        throw new Error(`stdout did not print the address ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the balance <([A-Za-z0-9_]+)> satoshis$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (!world.stdout.includes(`Balance: ${expected} satoshis`)) {
        throw new Error(`stdout did not print the balance ${expected} satoshis: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command does not print the mnemonic <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const mnemonic = exampleValue(example, match[1])
      if (world.stdout.includes(mnemonic)) {
        throw new Error(`stdout unexpectedly printed the mnemonic: ${JSON.stringify(world.stdout)}`)
      }
    }
  }
]

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

export { createWorld, handleStep }
