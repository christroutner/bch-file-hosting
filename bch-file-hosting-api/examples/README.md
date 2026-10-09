# bch-file-hosting-api examples

The hosting workflow is three steps: upload, pay, confirm. These examples use
`curl` and [`jq`](https://jqlang.github.io/jq/) against a local server started
with `npm start` (default port 5050).

```bash
API=http://localhost:5050
```

## 1. Upload a file and get a quote

```bash
curl -s -F "file=@./photo.jpg" $API/files | tee quote.json | jq
```

```json
{
  "success": true,
  "alreadyHosted": false,
  "cid": "bafybei...",
  "filename": "photo.jpg",
  "sizeBytes": 20000,
  "billedBytes": 100000,
  "priceSats": 2000,
  "priceBch": 0.00002,
  "usdPrice": 0.001,
  "paymentAddress": "bitcoincash:q...",
  "quoteExpiresAt": "2026-10-09T12:00:00.000Z"
}
```

Files under 100 KB are billed as 100 KB, and every invoice is at least
`MIN_INVOICE_SATS`. If the file is already hosted, `alreadyHosted` is `true`
and the response contains the download links instead of a payment address.

## 2. Pay the invoice

Send at least `priceSats` to `paymentAddress` from any BCH wallet. Unconfirmed
(0-conf) payments are accepted. Unpaid uploads are deleted once the quote
expires (`QUOTE_TTL_HOURS`, default 24).

## 3. Check the payment and get the links

```bash
ADDR=$(jq -r .paymentAddress quote.json)
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"paymentAddress\":\"$ADDR\"}" $API/files/check-payment | jq
```

Before payment:

```json
{ "success": true, "status": "unpaid", "receivedSats": 0, "requiredSats": 2000, "quoteExpiresAt": "..." }
```

After payment:

```json
{
  "success": true,
  "status": "paid",
  "cid": "bafybei...",
  "filename": "photo.jpg",
  "paidAt": "...",
  "receivedSats": 2000,
  "hostedUntil": "2027-10-08T12:00:00.000Z",
  "downloadUrl": "http://localhost:5050/download/bafybei...",
  "gatewayUrls": ["https://ipfs.io/ipfs/bafybei.../photo.jpg", "https://dweb.link/ipfs/bafybei.../photo.jpg"]
}
```

Checking again is safe; it returns the same result.

## Other endpoints

```bash
# Hosting status and pins for a file
curl -s $API/files/bafybei... | jq

# Download a paid file
curl -OJ $API/download/bafybei...

# Service health
curl -s $API/health | jq
```

## Admin endpoints

Require the `x-api-key` header to match `ADMIN_API_KEY`. They return 503 when
`ADMIN_API_KEY` is not set.

```bash
KEY=your-admin-key

# List invoices (optional filters: status=awaitingPayment|paid|deleted,
# sweepStatus=pending|swept|empty)
curl -s -H "x-api-key: $KEY" "$API/admin/invoices?status=paid" | jq

# Retry sweeps that failed
curl -s -X POST -H "x-api-key: $KEY" $API/admin/sweeps/retry | jq

# Delete expired unpaid uploads now instead of waiting for the hourly timer
curl -s -X POST -H "x-api-key: $KEY" $API/admin/cleanup/run | jq

# Remove a file from every pinning provider (moderation)
curl -s -X POST -H "x-api-key: $KEY" $API/admin/files/bafybei.../delete | jq
```

## Errors

Errors return `{ "success": false, "error": "..." }` with these statuses:

| Status | Meaning |
|--------|---------|
| 400 | Malformed JSON body |
| 401 | Missing or wrong admin API key |
| 404 | Unknown invoice, file, or route; or the file is not paid for |
| 413 | File is larger than `MAX_FILE_SIZE_BYTES` |
| 422 | Invalid input (no file, wrong field name, bad address) |
| 429 | Rate limit reached (`RATE_LIMIT_PER_MIN`) |
| 503 | Admin API disabled, or `/health` reports a component down |
