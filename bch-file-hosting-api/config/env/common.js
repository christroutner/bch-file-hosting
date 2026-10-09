/*
  Application settings common to all environments. Every value can be
  overridden with an environment variable; see .env.example.
*/

import { readFileSync } from 'fs'

const pkgInfo = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url))
)

function toNumber (value, fallback) {
  if (value === undefined || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) {
    throw new Error(`Expected a number but got '${value}'`)
  }
  return num
}

function toBool (value, fallback) {
  if (value === undefined || value === '') return fallback
  return value === 'true'
}

function toList (value, fallback) {
  if (value === undefined) return fallback
  return value.split(',').map(x => x.trim()).filter(x => x)
}

const walletInterface = process.env.WALLET_INTERFACE || 'web3'
const defaultApiServers = {
  web3: 'https://free-bch.fullstack.cash',
  web2: 'https://bch.fullstack.cash/v6/',
  x402: 'https://x402-bch.fullstack.cash/v6/'
}

const port = toNumber(process.env.PORT, 5050)

export default {
  version: pkgInfo.version,
  port,
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${port}`,
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: process.env.LOG_DIR || './logs',

  // Wallet
  mnemonic: process.env.MNEMONIC || '',
  treasuryAddress: process.env.TREASURY_ADDRESS || '',
  walletInterface,
  apiServer: process.env.APISERVER || defaultApiServers[walletInterface],
  walletWifX402: process.env.WALLET_WIF_X402 || '',

  // Pricing
  usdPerMbYear: toNumber(process.env.USD_PER_MB_YEAR, 0.01),
  minBilledBytes: toNumber(process.env.MIN_BILLED_BYTES, 100000),
  minInvoiceSats: toNumber(process.env.MIN_INVOICE_SATS, 2000),
  underpayToleranceSats: toNumber(process.env.UNDERPAY_TOLERANCE_SATS, 100),
  quoteTtlHours: toNumber(process.env.QUOTE_TTL_HOURS, 24),
  hostingTermDays: 365,

  // Uploads and storage
  maxFileSizeBytes: toNumber(process.env.MAX_FILE_SIZE_BYTES, 100000000),
  uploadTmpDir: process.env.UPLOAD_TMP_DIR || './tmp/uploads',
  levelDbPath: process.env.LEVEL_DB_PATH || './.leveldb',

  // IPFS
  ipfsDir: process.env.IPFS_DIR || './.ipfsdata',
  ipfsTcpPort: toNumber(process.env.IPFS_TCP_PORT, 4001),
  ipfsWsPort: toNumber(process.env.IPFS_WS_PORT, 4003),
  enableCircuitRelay: toBool(process.env.ENABLE_CIRCUIT_RELAY, false),
  enableIpfsCoord: !toBool(process.env.DISABLE_IPFS_COORD, false),
  coordName: process.env.COORD_NAME || 'bch-file-hosting',
  publicGateways: toList(process.env.PUBLIC_GATEWAYS, [
    'https://ipfs.io/ipfs/',
    'https://dweb.link/ipfs/'
  ]),
  pinningProviders: toList(process.env.PINNING_PROVIDERS, []),

  // Lighthouse third-party pinning (enabled by naming 'lighthouse' in
  // PINNING_PROVIDERS). The API key is required to pin; the gateway is a
  // dedicated host because the public gateway is restricted to premium plans.
  lighthouseApiKey: process.env.LIGHTHOUSE_API_KEY || '',
  lighthouseApiUrl: process.env.LIGHTHOUSE_API_URL || 'https://api.lighthouse.storage',
  lighthouseGateway: process.env.LIGHTHOUSE_GATEWAY || 'https://gateway.lighthouse.storage/ipfs/',

  // Access control
  adminApiKey: process.env.ADMIN_API_KEY || '',
  rateLimitPerMin: toNumber(process.env.RATE_LIMIT_PER_MIN, 30),
  // Set when running behind a reverse proxy, so rate limits use the client IP.
  trustProxy: toBool(process.env.TRUST_PROXY, false)
}

export { toNumber, toBool, toList }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:27:54.433Z","module_hash":"6b3b538765e065708fd952780e2aca65e55d344ed407c4807ab836aca6811f86","functions":[{"id":"func/toNumber","name":"toNumber","line":12,"end_line":19,"hash":"a0c7144f55a72b6455ced6f67b5381d25b4538b420720b7dcb51268b2d3ccd95"},{"id":"func/toBool","name":"toBool","line":21,"end_line":24,"hash":"8ba6915e27475d2fc18a4d5669d4a26d502b3a7cb559514545a2fea06c2481ba"},{"id":"func/toList","name":"toList","line":26,"end_line":29,"hash":"5aa7dff946f9b8feac41700c9e501d8f45f20fd205fac7ced45ec7b6bcdc5bdb"}]}
// mutate4javascript-manifest-end
