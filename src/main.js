import QRCode from "qrcode";
import "./styles.css";

const CASH_APP_LIGHTNING_BASE = "https://cash.app/launch/lightning/";
const SAMPLE_LIGHTNING_ADDRESS = "austin@vlt.ge";
const SAMPLE_AMOUNT_MSATS = 1000;

const refs = {
  invoiceInput: document.querySelector("#invoice-input"),
  sampleInvoiceButton: document.querySelector("#sample-invoice-button"),
  sampleStatus: document.querySelector("#sample-status"),
  openCashAppLink: document.querySelector("#open-cashapp-link"),
  copyLinkButton: document.querySelector("#copy-link-button"),
  copyInvoiceButton: document.querySelector("#copy-invoice-button"),
  cashAppUrl: document.querySelector("#cashapp-url"),
  qrFrame: document.querySelector(".qr-frame"),
  qrCanvas: document.querySelector("#qr-canvas"),
  qrPlaceholder: document.querySelector("#qr-placeholder"),
  networkValue: document.querySelector("#network-value"),
  amountValue: document.querySelector("#amount-value"),
  invoiceNote: document.querySelector("#invoice-note")
};

function extractInvoice(rawValue) {
  let value = rawValue.trim().replace(/\s+/g, "");
  if (!value) return "";

  const cashAppMatch = value.match(/cash\.app\/launch\/lightning\/([^?#]+)/i);
  if (cashAppMatch) return safeDecode(cashAppMatch[1]);

  const lightningParamMatch = value.match(/[?&]lightning=([^&]+)/i);
  if (lightningParamMatch) return safeDecode(lightningParamMatch[1]);

  if (/^lightning:/i.test(value)) {
    value = value.replace(/^lightning:/i, "");
  }

  return safeDecode(value);
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function inspectInvoice(invoice) {
  if (!invoice) {
    return {
      network: "Empty",
      amount: "Empty",
      note: "Use a fresh, low-value mainnet invoice.",
      usable: false
    };
  }

  const lower = invoice.toLowerCase();
  const isLower = invoice === lower;
  const isUpper = invoice === invoice.toUpperCase();
  const hrpEnd = lower.lastIndexOf("1");
  const hrp = hrpEnd > -1 ? lower.slice(0, hrpEnd) : "";
  const body = hrp.startsWith("ln") ? hrp.slice(2) : "";
  const networkCode = ["bcrt", "bc", "tbs", "tb", "bs"].find((code) => body.startsWith(code));
  const amountPart = networkCode ? body.slice(networkCode.length) : "";

  if (!lower.startsWith("ln") || !networkCode) {
    return {
      network: "Unrecognized",
      amount: "Unknown",
      note: "Not a BOLT11 invoice yet.",
      usable: false
    };
  }

  if (!isLower && !isUpper) {
    return {
      network: networkLabel(networkCode),
      amount: amountLabel(amountPart),
      note: "BOLT11 cannot be mixed case.",
      usable: false
    };
  }

  if (networkCode !== "bc") {
    return {
      network: networkLabel(networkCode),
      amount: amountLabel(amountPart),
      note: "Cash App expects mainnet lnbc invoices.",
      usable: true
    };
  }

  if (!amountPart) {
    return {
      network: networkLabel(networkCode),
      amount: "Amountless",
      note: "Amounted invoices are easiest to test.",
      usable: true
    };
  }

  return {
    network: networkLabel(networkCode),
    amount: amountLabel(amountPart),
    note: "Ready. Tap Open Cash App or scan the QR.",
    usable: true
  };
}

function networkLabel(code) {
  const labels = {
    bc: "Bitcoin mainnet",
    tb: "Bitcoin testnet",
    tbs: "Bitcoin signet",
    bs: "Bitcoin signet",
    bcrt: "Bitcoin regtest"
  };
  return labels[code] || "Unknown";
}

function amountLabel(amountPart) {
  if (!amountPart) return "Amountless";

  const match = amountPart.match(/^(\d+)([munp]?)$/);
  if (!match) return "Unparsed";

  const unitsToSats = {
    "": 100_000_000,
    m: 100_000,
    u: 100,
    n: 0.1,
    p: 0.0001
  };
  const sats = Number(match[1]) * unitsToSats[match[2]];

  if (!Number.isFinite(sats)) return "Unparsed";
  if (sats === 1) return "1 sat";
  if (sats >= 1) return `${formatNumber(sats)} sats`;
  return `${sats} sats`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 4
  }).format(value);
}

async function getSampleInvoice() {
  setSampleLoading(true, "Requesting 1 sat invoice...");

  try {
    const payRequest = await fetchLightningAddress(SAMPLE_LIGHTNING_ADDRESS);
    validatePayRequest(payRequest);

    const callbackUrl = new URL(payRequest.callback);
    callbackUrl.searchParams.set("amount", String(SAMPLE_AMOUNT_MSATS));
    if (payRequest.commentAllowed > 0) {
      callbackUrl.searchParams.set("comment", "Cash App deep link demo");
    }

    const response = await fetch(callbackUrl);
    if (!response.ok) throw new Error(`Invoice request failed with HTTP ${response.status}`);

    const invoiceResponse = await response.json();
    if (invoiceResponse.status === "ERROR") {
      throw new Error(invoiceResponse.reason || "The Lightning Address returned an error.");
    }
    if (!invoiceResponse.pr) throw new Error("The Lightning Address did not return a BOLT11 invoice.");

    refs.invoiceInput.value = invoiceResponse.pr;
    render();
    setSampleLoading(false, "Loaded fresh 1 sat invoice.");
  } catch (error) {
    setSampleLoading(false, error.message || "Could not generate a sample invoice.");
  }
}

async function fetchLightningAddress(address) {
  const [name, domain] = address.split("@");
  if (!name || !domain) throw new Error("Invalid Lightning Address.");

  const response = await fetch(`https://${domain}/.well-known/lnurlp/${encodeURIComponent(name)}`);
  if (!response.ok) throw new Error(`Lightning Address lookup failed with HTTP ${response.status}`);

  return response.json();
}

function validatePayRequest(payRequest) {
  if (payRequest.tag !== "payRequest") {
    throw new Error("Lightning Address did not return an LNURL-pay request.");
  }
  if (!payRequest.callback) {
    throw new Error("Lightning Address did not include a payment callback.");
  }
  if (SAMPLE_AMOUNT_MSATS < payRequest.minSendable || SAMPLE_AMOUNT_MSATS > payRequest.maxSendable) {
    throw new Error("austin@vlt.ge does not currently allow a 1 sat invoice.");
  }
}

function setSampleLoading(isLoading, message) {
  refs.sampleInvoiceButton.disabled = isLoading;
  refs.sampleInvoiceButton.textContent = isLoading ? "Getting..." : "Get 1 sat";
  refs.sampleStatus.textContent = message;
}

function render() {
  const invoice = extractInvoice(refs.invoiceInput.value);
  const inspection = inspectInvoice(invoice);
  const cashAppUrl =
    invoice && inspection.usable ? `${CASH_APP_LIGHTNING_BASE}${encodeURIComponent(invoice)}` : "";

  refs.networkValue.textContent = inspection.network;
  refs.amountValue.textContent = inspection.amount;
  refs.invoiceNote.textContent = inspection.note;
  refs.cashAppUrl.textContent = cashAppUrl || "Paste an invoice to generate a link.";

  if (cashAppUrl) {
    refs.openCashAppLink.href = cashAppUrl;
  } else {
    refs.openCashAppLink.removeAttribute("href");
  }
  refs.openCashAppLink.classList.toggle("disabled", !cashAppUrl);
  refs.openCashAppLink.setAttribute("aria-disabled", String(!cashAppUrl));
  refs.openCashAppLink.tabIndex = cashAppUrl ? 0 : -1;
  refs.copyLinkButton.disabled = !cashAppUrl;
  refs.copyInvoiceButton.disabled = !invoice;

  renderQr(cashAppUrl);
}

function renderQr(value) {
  const context = refs.qrCanvas.getContext("2d");
  context.clearRect(0, 0, refs.qrCanvas.width, refs.qrCanvas.height);

  if (!value) {
    refs.qrCanvas.hidden = true;
    refs.qrPlaceholder.hidden = false;
    return;
  }

  const size = getQrSize();
  refs.qrCanvas.hidden = false;
  refs.qrPlaceholder.hidden = true;
  refs.qrCanvas.className = "";
  QRCode.toCanvas(refs.qrCanvas, value, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#111827",
      light: "#ffffff"
    }
  }).catch(() => {
    refs.qrCanvas.hidden = true;
    refs.qrPlaceholder.hidden = false;
  });
}

function getQrSize() {
  const frameWidth = refs.qrFrame?.clientWidth || 224;
  return Math.round(Math.min(232, Math.max(176, frameWidth - 36)));
}

async function copyText(value, button) {
  if (!value) return;

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    copyViaTextArea(value);
  }

  const previous = button.textContent;
  button.textContent = "Copied";
  window.setTimeout(() => {
    button.textContent = previous;
  }, 1100);
}

function copyViaTextArea(value) {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function currentInvoice() {
  return extractInvoice(refs.invoiceInput.value);
}

function currentCashAppUrl() {
  const invoice = currentInvoice();
  const inspection = inspectInvoice(invoice);
  return invoice && inspection.usable ? `${CASH_APP_LIGHTNING_BASE}${encodeURIComponent(invoice)}` : "";
}

refs.invoiceInput.addEventListener("input", render);

refs.sampleInvoiceButton.addEventListener("click", getSampleInvoice);

refs.openCashAppLink.addEventListener("click", (event) => {
  if (!currentCashAppUrl()) event.preventDefault();
});

refs.copyLinkButton.addEventListener("click", () => {
  copyText(currentCashAppUrl(), refs.copyLinkButton);
});

refs.copyInvoiceButton.addEventListener("click", () => {
  copyText(currentInvoice(), refs.copyInvoiceButton);
});

window.addEventListener("resize", () => {
  window.requestAnimationFrame(render);
});

render();
