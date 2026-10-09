/*
  Pure price calculation. All amounts that are stored or compared are integer
  satoshis; priceBch and usdPrice are for display only.
*/

const BYTES_PER_MB = 1000000
const SATS_PER_BCH = 100000000

export function calculatePrice ({ sizeBytes, usdPerBch, cfg }) {
  if (!Number.isInteger(sizeBytes) || sizeBytes < 0) {
    throw new Error('sizeBytes must be a non-negative integer')
  }
  if (typeof usdPerBch !== 'number' || !Number.isFinite(usdPerBch) || usdPerBch <= 0) {
    throw new Error('usdPerBch must be a positive number')
  }

  const billedBytes = Math.max(sizeBytes, cfg.minBilledBytes)
  const usdPrice = (billedBytes / BYTES_PER_MB) * cfg.usdPerMbYear

  // Round away floating-point noise before ceil, so an exact 2500 sats does
  // not become 2501 because the float came out as 2500.0000000000005.
  const exactSats = (usdPrice / usdPerBch) * SATS_PER_BCH
  const rawSats = Math.ceil(Math.round(exactSats * 1e6) / 1e6)

  const priceSats = Math.max(rawSats, cfg.minInvoiceSats)

  return {
    billedBytes,
    usdPrice: Math.round(usdPrice * 1e8) / 1e8,
    priceSats,
    priceBch: priceSats / SATS_PER_BCH
  }
}

export default { calculatePrice }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:25:37.230Z","module_hash":"9f0bce7a38b9243f098d9638a5e6cf0031a9dccbb97cae8906505b9f1f84935c","functions":[{"id":"func/calculatePrice","name":"calculatePrice","line":9,"end_line":33,"hash":"550f432a2935d161db1d4dda46d2895e1305cc6cb5d262be356f593844131513"}]}
// mutate4javascript-manifest-end
