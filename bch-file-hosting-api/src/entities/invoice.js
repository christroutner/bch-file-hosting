/*
  Invoice entity. An invoice is the price quote and unique payment address
  issued for one uploaded file. All amounts are integer satoshis.
*/

export const INVOICE_STATUS = Object.freeze({
  AWAITING_PAYMENT: 'awaitingPayment',
  PAID: 'paid',
  DELETED: 'deleted'
})

// pending: a sweep failed and will be retried. swept: funds sent to the
// treasury. empty: nothing left to sweep (for example, swept before a restart).
export const SWEEP_STATUS = Object.freeze({
  PENDING: 'pending',
  SWEPT: 'swept',
  EMPTY: 'empty'
})

const CASH_ADDRESS_REGEX = /^bitcoincash:[qp][02-9ac-hj-np-z]{41}$/

function assertPositiveInteger (value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Property '${name}' must be a positive integer`)
  }
}

function assertNonNegativeInteger (value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Property '${name}' must be a non-negative integer`)
  }
}

function assertIsoDate (value, name) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`Property '${name}' must be an ISO date string`)
  }
}

function assertAddress (paymentAddress) {
  if (typeof paymentAddress !== 'string' || !CASH_ADDRESS_REGEX.test(paymentAddress)) {
    throw new Error("Property 'paymentAddress' must be a bitcoincash: cash address")
  }
}

function assertIdentity ({ hdIndex, cid, filename }) {
  // Index 0 is the server's main wallet, so invoices start at 1.
  assertPositiveInteger(hdIndex, 'hdIndex')

  if (!cid || typeof cid !== 'string') {
    throw new Error("Property 'cid' must be a non-empty string")
  }
  if (!filename || typeof filename !== 'string') {
    throw new Error("Property 'filename' must be a non-empty string")
  }
}

function assertAmounts ({ sizeBytes, billedBytes, priceSats, usdPrice, usdPerBch }) {
  assertNonNegativeInteger(sizeBytes, 'sizeBytes')
  assertPositiveInteger(billedBytes, 'billedBytes')
  assertPositiveInteger(priceSats, 'priceSats')

  if (typeof usdPrice !== 'number' || !(usdPrice > 0)) {
    throw new Error("Property 'usdPrice' must be a positive number")
  }
  if (typeof usdPerBch !== 'number' || !(usdPerBch > 0)) {
    throw new Error("Property 'usdPerBch' must be a positive number")
  }
}

function assertDates ({ createdAt, quoteExpiresAt }) {
  assertIsoDate(createdAt, 'createdAt')
  assertIsoDate(quoteExpiresAt, 'quoteExpiresAt')
  if (Date.parse(quoteExpiresAt) <= Date.parse(createdAt)) {
    throw new Error("Property 'quoteExpiresAt' must be after 'createdAt'")
  }
}

class Invoice {
  // Validate the data for a new invoice and return it with its initial status.
  validate (data = {}) {
    const {
      paymentAddress, hdIndex, cid, filename, sizeBytes, billedBytes,
      priceSats, usdPrice, usdPerBch, createdAt, quoteExpiresAt
    } = data

    assertAddress(paymentAddress)
    assertIdentity({ hdIndex, cid, filename })
    assertAmounts({ sizeBytes, billedBytes, priceSats, usdPrice, usdPerBch })
    assertDates({ createdAt, quoteExpiresAt })

    return {
      paymentAddress,
      hdIndex,
      cid,
      filename,
      sizeBytes,
      billedBytes,
      priceSats,
      usdPrice,
      usdPerBch,
      status: INVOICE_STATUS.AWAITING_PAYMENT,
      createdAt,
      quoteExpiresAt,
      paidAt: null,
      receivedSats: 0,
      sweepTxid: null,
      sweepStatus: null
    }
  }

  isQuoteExpired ({ quoteExpiresAt, now = new Date() }) {
    return now.getTime() >= Date.parse(quoteExpiresAt)
  }

  isPaymentSufficient ({ priceSats, receivedSats, toleranceSats }) {
    assertPositiveInteger(priceSats, 'priceSats')
    assertNonNegativeInteger(receivedSats, 'receivedSats')
    assertNonNegativeInteger(toleranceSats, 'toleranceSats')

    // An empty address never counts as paid, even if the tolerance exceeds the price.
    return receivedSats > 0 && receivedSats >= priceSats - toleranceSats
  }
}

export default Invoice
