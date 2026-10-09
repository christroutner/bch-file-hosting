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

  // Access control
  adminApiKey: process.env.ADMIN_API_KEY || '',
  rateLimitPerMin: toNumber(process.env.RATE_LIMIT_PER_MIN, 30),
  // Set when running behind a reverse proxy, so rate limits use the client IP.
  trustProxy: toBool(process.env.TRUST_PROXY, false)
}

export { toNumber, toBool, toList }
