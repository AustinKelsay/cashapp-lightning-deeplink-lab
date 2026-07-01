# Cash App Lightning Deep Link Demo

Demo for opening a BOLT11 Lightning invoice in Cash App from the web.

## Working flow

Confirmed July 1, 2026:

```js
const cashAppLightningUrl =
  `https://cash.app/launch/lightning/${encodeURIComponent(bolt11)}`;
```

On phones with Cash App, this universal link can load the payment screen directly.

## Methodology

1. Generate a fresh, low-value mainnet BOLT11 invoice.
2. URL-encode the invoice.
3. Append it to `https://cash.app/launch/lightning/`.
4. Open the URL from a tap or QR scan.
5. Keep copy-paste as fallback.

Parsing and link generation happen in the browser. This app does not store invoices.

## Sample invoice option

The demo can request a fresh 1 sat invoice from `austin@vlt.ge`.

Flow:

1. Fetch `https://vlt.ge/.well-known/lnurlp/austin`.
2. Confirm the response is a `payRequest`.
3. Confirm `1000` msats is allowed.
4. Call the callback with `amount=1000`.
5. Put the returned `pr` into the link builder.

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

## License

MIT
