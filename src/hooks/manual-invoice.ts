import { afterCreate, afterUpdate, beforeCreate } from "@njinlabs/njin";
import manualInvoice from "../models/manual-invoice";
import checkoutVars from "../vars/checkout";
import { createInvoice as createDokuInvoice } from "../services/doku";
import { DOKU_WEBHOOK_PATH } from "../routes/checkout";
import siteUrl from "../lib/site-url";

const generateInvoiceNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${date}-${rand}`;
};

beforeCreate(manualInvoice, async () => ({ invoiceNumber: generateInvoiceNumber(), status: "PENDING" }));

// Guards against the manualInvoice.update() call below re-entering this same
// afterUpdate handler, same pattern as src/hooks/mail-account.ts.
const generating = new Set<string>();

const generateDokuLink = async (record: Awaited<ReturnType<typeof manualInvoice.create>>) => {
  const id = record.id.id as string;
  if (generating.has(id)) return;
  if (record.dokuPaymentUrl) return;
  if (record.status !== "PENDING") return;
  if (!record.invoiceNumber) return;

  const settings = await checkoutVars.get();
  if (!settings.dokuEnabled) {
    console.error(`[doku] cannot generate manual invoice "${record.invoiceNumber}": DOKU is disabled in Checkout settings`);
    return;
  }

  generating.add(id);
  try {
    const origin = siteUrl();
    const invoice = await createDokuInvoice({
      invoiceNumber: record.invoiceNumber,
      amount: record.amount,
      customerName: record.customerName,
      customerEmail: record.customerEmail,
      customerPhone: record.customerPhone,
      lineItems: [{ id: "1", name: record.description, quantity: 1, price: record.amount }],
      callbackUrl: `${origin}/invoice/${record.invoiceNumber}`,
      callbackUrlCancel: `${origin}/invoice/${record.invoiceNumber}`,
      callbackUrlResult: `${origin}/invoice/${record.invoiceNumber}`,
      notificationUrl: `${origin}${DOKU_WEBHOOK_PATH}`,
    });

    await manualInvoice.update(id, {
      dokuTokenId: invoice.tokenId,
      dokuPaymentUrl: invoice.paymentUrl,
    });
  } catch (err) {
    // Don't fail the create/update request just because DOKU is unreachable —
    // admin can retry by saving the record again (afterUpdate below re-runs this).
    console.error(`[doku] failed to generate manual invoice link for "${record.invoiceNumber}":`, err);
  } finally {
    generating.delete(id);
  }
};

afterCreate(manualInvoice, generateDokuLink);
afterUpdate(manualInvoice, generateDokuLink);
