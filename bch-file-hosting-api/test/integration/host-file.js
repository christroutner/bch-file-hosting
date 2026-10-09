/*
  Manual mainnet integration test. SPENDS REAL BCH (about one minimum invoice
  plus a transaction fee per run).

  Runs the whole workflow against a server started in this process:
    1. upload a small random file and get a quote
    2. confirm the invoice reads as unpaid
    3. pay it from the TEST_PAYER_WIF wallet
    4. poll check-payment until it reports paid
    5. download the file and compare bytes
    6. confirm the payment was swept to TREASURY_ADDRESS
    7. restart the server and confirm the invoice and HD counter survived

  Requires MNEMONIC, TREASURY_ADDRESS, and TEST_PAYER_WIF in .env.
  Run with: npm run test:integration
  Optional: MAX_TEST_SATS (default 10000) caps what the script will pay.
*/

import { createHash, randomBytes } from 'crypto'
import BchWallet from 'minimal-slp-wallet'

import config from '../../config/index.js'
import Server from '../../bin/server.js'
import WalletAdapter from '../../src/adapters/wallet.adapter.js'

const MAX_TEST_SATS = Number(process.env.MAX_TEST_SATS || 10000)
const TEST_FILE_BYTES = 50000
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 120000
const SWEEP_TIMEOUT_MS = 60000

const API = config.publicUrl.replace(/\/+$/, '')
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function step (message) {
  console.log(`\n=== ${message}`)
}

function check (condition, message) {
  if (!condition) throw new Error(`Check failed: ${message}`)
  console.log(`  ok: ${message}`)
}

async function api (path, options = {}) {
  const res = await fetch(`${API}${path}`, options)
  const body = res.headers.get('content-type')?.includes('application/json')
    ? await res.json()
    : Buffer.from(await res.arrayBuffer())
  return { status: res.status, body }
}

function checkPayment (paymentAddress) {
  return api('/files/check-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentAddress })
  })
}

async function openPayerWallet () {
  // Reuse the server's backend settings so the payer talks to the same API.
  const options = new WalletAdapter({ config }).getWalletOptions()
  const wallet = new BchWallet(process.env.TEST_PAYER_WIF, options)
  await wallet.walletInfoPromise
  await wallet.initialize()
  return wallet
}

async function waitFor (label, timeoutMs, fn) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await fn()
    if (result) return result
    process.stdout.write('.')
    await sleep(POLL_INTERVAL_MS)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function main () {
  for (const key of ['MNEMONIC', 'TREASURY_ADDRESS', 'TEST_PAYER_WIF']) {
    if (!process.env[key]) throw new Error(`${key} must be set in .env`)
  }

  step('Opening the payer wallet')
  const payer = await openPayerWallet()
  const payerAddress = payer.walletInfo.cashAddress
  const payerBalance = await payer.getBalance()
  console.log(`  payer: ${payerAddress}`)
  console.log(`  payer balance: ${payerBalance} sats`)
  check(payerAddress !== config.treasuryAddress, 'payer wallet is not the treasury')

  const treasuryBefore = await payer.getBalance({ bchAddress: config.treasuryAddress })
  console.log(`  treasury balance before: ${treasuryBefore} sats`)

  step('Starting the server')
  const server = new Server({ config })
  await server.start()
  let serverRunning = true

  try {
    const health = await api('/health')
    check(health.status === 200, `GET /health is up (${JSON.stringify(health.body)})`)

    step('1. Uploading a random test file')
    const fileBytes = randomBytes(TEST_FILE_BYTES)
    const form = new FormData()
    form.append('file', new Blob([fileBytes]), `integration-${Date.now()}.bin`)
    const quote = await api('/files', { method: 'POST', body: form })
    console.log(`  quote: ${JSON.stringify(quote.body)}`)
    check(quote.status === 200 && quote.body.paymentAddress, 'upload returned a payment address')

    const { paymentAddress, priceSats, cid } = quote.body
    check(priceSats <= MAX_TEST_SATS, `price ${priceSats} sats is within MAX_TEST_SATS (${MAX_TEST_SATS})`)
    check(payerBalance >= priceSats + 1000, 'payer can cover the price plus a fee')

    step('2. Checking the invoice before payment')
    const unpaid = await checkPayment(paymentAddress)
    check(unpaid.body.status === 'unpaid', `invoice reads as unpaid (${JSON.stringify(unpaid.body)})`)

    step(`3. Paying ${priceSats} sats to ${paymentAddress}`)
    const paymentTxid = await payer.send([{ address: paymentAddress, amountSat: priceSats }])
    console.log(`  payment txid: ${paymentTxid}`)

    step('4. Polling check-payment until it reports paid')
    const paid = await waitFor('payment', POLL_TIMEOUT_MS, async () => {
      const res = await checkPayment(paymentAddress)
      return res.body.status === 'paid' ? res.body : null
    })
    console.log(`\n  paid: ${JSON.stringify(paid)}`)
    check(paid.cid === cid, 'paid result has the uploaded CID')
    check(paid.downloadUrl === `${API}/download/${cid}`, 'paid result has the download URL')
    check(paid.gatewayUrls.length > 0, 'paid result has gateway URLs')

    const status = await api(`/files/${cid}`)
    check(status.body.status === 'pinned', `file is pinned (${JSON.stringify(status.body.pins)})`)

    step('5. Downloading and comparing bytes')
    const download = await api(`/download/${cid}`)
    check(download.status === 200, 'download returned 200')
    check(sha256(download.body) === sha256(fileBytes), 'downloaded bytes match the upload')

    step('6. Confirming the sweep to the treasury')
    await waitFor('the sweep', SWEEP_TIMEOUT_MS, async () => {
      const left = await payer.getBalance({ bchAddress: paymentAddress })
      return left === 0
    })
    console.log('')
    check(true, 'invoice address is empty')
    const treasuryAfter = await payer.getBalance({ bchAddress: config.treasuryAddress })
    console.log(`  treasury balance after: ${treasuryAfter} sats (+${treasuryAfter - treasuryBefore})`)
    check(treasuryAfter > treasuryBefore, 'treasury balance increased')

    if (config.adminApiKey) {
      const invoices = await api('/admin/invoices?status=paid', { headers: { 'x-api-key': config.adminApiKey } })
      const invoice = invoices.body.invoices.find(i => i.paymentAddress === paymentAddress)
      check(invoice?.sweepStatus === 'swept', `invoice sweepStatus is swept (txid ${invoice?.sweepTxid})`)
    }

    step('7. Restarting the server')
    await server.stop()
    serverRunning = false
    await server.start()
    serverRunning = true

    const afterRestart = await checkPayment(paymentAddress)
    check(afterRestart.body.status === 'paid', 'invoice is still paid after the restart')
    check(afterRestart.body.paidAt === paid.paidAt, 'paid result is unchanged after the restart')

    const secondForm = new FormData()
    secondForm.append('file', new Blob([randomBytes(1000)]), `integration-hd-${Date.now()}.bin`)
    const secondQuote = await api('/files', { method: 'POST', body: secondForm })
    check(
      secondQuote.body.paymentAddress && secondQuote.body.paymentAddress !== paymentAddress,
      `a new upload gets a new address after the restart (${secondQuote.body.paymentAddress})`
    )
    console.log('  (this second invoice is left unpaid; cleanup deletes it after QUOTE_TTL_HOURS)')

    step('PASSED')
    console.log(`  CID: ${cid}`)
    console.log(`  payment txid: ${paymentTxid}`)
  } finally {
    if (serverRunning) await server.stop()
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\nFAILED: ${err.message}`)
    process.exit(1)
  })
