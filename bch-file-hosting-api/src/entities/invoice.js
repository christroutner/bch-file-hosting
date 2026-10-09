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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:25:50.716Z","module_hash":"bc99188fcb4cf16e73c3ffc07ccbb14acf387697c120800e8a476471357f951d","functions":[{"id":"func/assertPositiveInteger","name":"assertPositiveInteger","line":22,"end_line":26,"hash":"35885d2ce503adacf8f71963e8883967178bf58f5e2237542df96476c6bc9eb5"},{"id":"func/assertNonNegativeInteger","name":"assertNonNegativeInteger","line":28,"end_line":32,"hash":"6162ecade2f5adccfd3a13686446f09c1976fc0b3fa37a6b6ae25da83681e3ea"},{"id":"func/assertIsoDate","name":"assertIsoDate","line":34,"end_line":38,"hash":"fccb529627c4d1d41bfc0f73ebce4d1470a4df98baace0800c4473720cc1ff20"},{"id":"func/assertAddress","name":"assertAddress","line":40,"end_line":44,"hash":"ec7b46b2dd137c159f3a6d98205fac257fb612db15e41c68aa7c8118e8e0f03a"},{"id":"func/assertIdentity","name":"assertIdentity","line":46,"end_line":56,"hash":"bffe9a1249384639da7a59fcdf0fd79b44f3ba85c693bbcffe788c243f82ab51"},{"id":"func/assertAmounts","name":"assertAmounts","line":58,"end_line":69,"hash":"3a1f031f8adf5d613a0b71a0a61a3ae8a27253b53ca7d1113df8e79e2dce93be"},{"id":"func/assertDates","name":"assertDates","line":71,"end_line":77,"hash":"325ee6fe5d340a19beae9bffaa99faf45678e54a2fd1da35e6832450683d8689"},{"id":"func/Invoice.validate","name":"Invoice.validate","line":81,"end_line":110,"hash":"7660a27cc34b3a8785648e33f6d3d79c3c3d762c840e16f78d5d4ca90376e177"},{"id":"func/Invoice.isQuoteExpired","name":"Invoice.isQuoteExpired","line":112,"end_line":114,"hash":"00d9559267b12b28696ec2a54b274117cd97d550baa0aaedf4aca10472e7e6d6"},{"id":"func/Invoice.isPaymentSufficient","name":"Invoice.isPaymentSufficient","line":116,"end_line":123,"hash":"1c2f75c1e00334885a829d5ae7a9a030ac387f5b8a165418e17b2557dfb9fc6d"}]}
// mutate4javascript-manifest-end
