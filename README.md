# Cash App Lightning Deep-Link Demo

Small explanatory demo for opening a BOLT11 Lightning invoice directly in Cash App from a web page.

## Working flow

Confirmed locally on July 1, 2026:

```js
const cashAppLightningUrl =
  `https://cash.app/launch/lightning/${encodeURIComponent(bolt11)}`;
```

When opened from a phone with Cash App installed, the universal link can hand the invoice to Cash App so the user does not have to manually navigate to Bitcoin and paste the invoice.

## Methodology

1. Generate a fresh, low-value Bitcoin mainnet BOLT11 invoice.
2. URL-encode the exact invoice string.
3. Append it to `https://cash.app/launch/lightning/`.
4. Open that URL from a direct user tap or scan it as a QR code.
5. Keep copy-the-invoice as the fallback if the universal link does not resolve.

All parsing and link generation in this demo happens in the browser. Invoice strings are not sent to a backend by this app.

## Sample invoice option

The demo can also request a fresh 1 sat invoice from `austin@vlt.ge`.

That uses the Lightning Address/LNURL-pay flow:

1. Fetch `https://vlt.ge/.well-known/lnurlp/austin`.
2. Confirm the response is a `payRequest`.
3. Confirm `1000` millisats is within `minSendable` and `maxSendable`.
4. Call the returned callback URL with `amount=1000`.
5. Put the returned `pr` BOLT11 invoice into the Cash App link builder.

## Run locally

```sh
npm install
npm run dev
```

## Sources checked

- Breez Spark SDK CashApp docs: <https://sdk-doc-spark.breez.technology/guide/buy_bitcoin.html#cashapp>
- Cash App Lightning help: <https://cash.app/help/us/en-US/6506-bitcoin-lightning>
- Cash App Bitcoin send/receive help: <https://cash.app/help/us/en-us/31021-sending-and-receiving-bitcoin>
- Lightning invoice URI background: <https://docs.lightning.engineering/the-lightning-network/payment-lifecycle/understanding-lightning-invoices>
