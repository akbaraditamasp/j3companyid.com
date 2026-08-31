// DOKU Checkout (Generate Invoice) API client — plain TS module, not a njin
// extension point. Non-SNAP signature scheme: Digest = base64(SHA256(rawBody)),
// Signature = HMACSHA256=base64(HMAC-SHA256(secretKey, stringToSign)) where
// stringToSign joins Client-Id/Request-Id/Request-Timestamp/Request-Target/Digest
// with \n (no trailing newline). Same scheme is reused to verify inbound webhooks
// in src/routes/checkout.ts, just with Request-Target set to the webhook's own path.
import { createHash, createHmac, randomUUID } from "node:crypto";

const CLIENT_ID = process.env.DOKU_CLIENT_ID ?? "";
const SECRET_KEY = process.env.DOKU_SECRET_KEY ?? "";
const IS_PRODUCTION = process.env.DOKU_IS_PRODUCTION === "true";

const BASE_URL = IS_PRODUCTION ? "https://api.doku.com" : "https://api-sandbox.doku.com";
const CHECKOUT_PATH = "/checkout/v1/payment";

const digest = (rawBody: string) => createHash("sha256").update(rawBody).digest("base64");

const signature = (params: { requestId: string; timestamp: string; target: string; digestValue: string }) => {
  const stringToSign = [
    `Client-Id:${CLIENT_ID}`,
    `Request-Id:${params.requestId}`,
    `Request-Timestamp:${params.timestamp}`,
    `Request-Target:${params.target}`,
    `Digest:${params.digestValue}`,
  ].join("\n");

  return `HMACSHA256=${createHmac("sha256", SECRET_KEY).update(stringToSign).digest("base64")}`;
};

export type CreateInvoiceParams = {
  invoiceNumber: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  lineItems: { id: string; name: string; quantity: number; price: number }[];
  callbackUrl: string;
  callbackUrlCancel: string;
  callbackUrlResult: string;
  notificationUrl: string;
};

export type CreateInvoiceResult = {
  paymentUrl: string;
  tokenId: string;
};

export const createInvoice = async (params: CreateInvoiceParams): Promise<CreateInvoiceResult> => {
  const body = JSON.stringify({
    order: {
      amount: params.amount,
      invoice_number: params.invoiceNumber,
      currency: "IDR",
      callback_url: params.callbackUrl,
      callback_url_cancel: params.callbackUrlCancel,
      callback_url_result: params.callbackUrlResult,
      line_items: params.lineItems,
    },
    payment: {
      payment_due_date: 60,
    },
    customer: {
      name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
    },
    additional_info: {
      override_notification_url: params.notificationUrl,
    },
  });

  const requestId = randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const digestValue = digest(body);

  const res = await fetch(`${BASE_URL}${CHECKOUT_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": CLIENT_ID,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature({ requestId, timestamp, target: CHECKOUT_PATH, digestValue }),
    },
    body,
  });

  if (!res.ok) throw new Error(`DOKU checkout request failed (${res.status})`);

  const json = (await res.json()) as { response: { payment: { url: string; token_id: string } } };
  return { paymentUrl: json.response.payment.url, tokenId: json.response.payment.token_id };
};

// Verifies a DOKU HTTP notification (webhook) against the same non-SNAP
// Client-Id/Request-Id/Request-Timestamp/Digest/Signature scheme used to sign
// outbound requests above — `target` must be the exact path DOKU was told to
// call (the notification/override_notification_url path), and `rawBody` must
// be the untouched request body bytes (digest is computed over the raw JSON).
export const verifyNotificationSignature = (params: {
  clientId: string;
  requestId: string;
  timestamp: string;
  target: string;
  rawBody: string;
  receivedSignature: string;
}) => {
  if (params.clientId !== CLIENT_ID) return false;

  const digestValue = digest(params.rawBody);
  const expected = signature({ requestId: params.requestId, timestamp: params.timestamp, target: params.target, digestValue });

  return expected === params.receivedSignature;
};
