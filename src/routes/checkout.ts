import { route } from "@njinlabs/njin";
import { status } from "elysia";
import z from "zod";
import order from "../models/order";
import product from "../models/product";
import checkoutVars from "../vars/checkout";
import shippingVars from "../vars/shipping";
import { calculateCost } from "../services/rajaongkir";

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY ?? "";
const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN ?? "";

const generateOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `J3-${date}-${rand}`;
};

// Xendit invoice "status" values we map onto our own order.status enum —
// anything else (e.g. "PENDING") just leaves the order untouched.
const XENDIT_STATUS_MAP: Record<string, "PAID" | "EXPIRED" | "FAILED"> = {
  PAID: "PAID",
  SETTLED: "PAID",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
};

export default route({ prefix: "/api/checkout" })
  .post(
    "/",
    async ({ body, request }) => {
      const settings = await checkoutVars.get();
      if (!settings.enabled) {
        return status(503, { message: "Checkout sedang tidak tersedia, silakan coba lagi nanti" });
      }

      // Server recomputes name/brand/price from the real product record for every line —
      // a client-submitted price/name is never trusted. Also refuses anything an admin
      // already hid (status flipped away from PUBLISH after a one-off item sold).
      const resolvedItems: { productSlug: string; name: string; brand: string; price: number; qty: number; subtotal: number }[] = [];
      let totalWeight = 0;

      for (const line of body.items) {
        const result = await product.read({
          filters: { slug: { $eq: line.slug }, status: { $eq: "PUBLISH" } },
          limit: 1,
          populate: ["brand"],
        });
        const p = result.data[0];

        if (!p) {
          return status(422, { message: `Produk "${line.slug}" sudah tidak tersedia` });
        }

        const qty = Math.max(1, Math.floor(line.qty));
        resolvedItems.push({
          productSlug: p.slug,
          name: p.name,
          brand: p.brand?.name ?? "",
          price: p.price,
          qty,
          subtotal: p.price * qty,
        });
        totalWeight += p.weight * qty;
      }

      const subtotal = resolvedItems.reduce((sum, i) => sum + i.subtotal, 0);

      // Shipping cost is recomputed here, server-side, from a fresh RajaOngkir quote —
      // this is the last point before the Xendit invoice amount is fixed, and the same
      // trust boundary already applied to product price: the client only ever *displays*
      // a cost from POST /api/shipping/quote, never supplies one that gets charged.
      const shippingSettings = await shippingVars.get();
      if (!shippingSettings.originAreaId) {
        return status(503, { message: "Pengiriman belum dikonfigurasi" });
      }

      const shippingOptions = await calculateCost({
        origin: shippingSettings.originAreaId,
        destination: body.destinationAreaId,
        weight: totalWeight,
        couriers: [body.courier],
      });
      const matchedShipping = shippingOptions.find(
        (o) => o.code === body.courier && o.service.toLowerCase() === body.service.toLowerCase(),
      );

      if (!matchedShipping) {
        return status(422, { message: "Opsi pengiriman tidak lagi tersedia, silakan pilih ulang" });
      }

      const shippingCost = matchedShipping.cost;
      const total = subtotal + shippingCost;
      const orderNumber = generateOrderNumber();

      const record = await order.create({
        orderNumber,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        shippingAddress: body.shippingAddress,
        items: resolvedItems,
        subtotal,
        shippingCost,
        shippingDestinationId: body.destinationAreaId,
        shippingDestinationLabel: body.destinationLabel,
        shippingCourier: matchedShipping.code,
        shippingService: matchedShipping.service,
        shippingEtd: matchedShipping.etd,
        total,
        status: "PENDING",
      });

      const origin = new URL(request.url).origin;

      const res = await fetch("https://api.xendit.co/v2/invoices", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${XENDIT_SECRET_KEY}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: orderNumber,
          amount: total,
          payer_email: body.customerEmail,
          description: `${settings.invoiceDescription} ${orderNumber}`,
          customer: {
            given_names: body.customerName,
            email: body.customerEmail,
            mobile_number: body.customerPhone,
          },
          items: resolvedItems.map((i) => ({
            name: i.brand ? `${i.brand} ${i.name}` : i.name,
            quantity: i.qty,
            price: i.price,
            category: i.brand || undefined,
          })),
          fees: shippingCost > 0 ? [{ type: "Ongkos Kirim", value: shippingCost }] : [],
          // Xendit invoices stay PENDING/payable after one declined/cancelled attempt
          // (only EXPIRED once the invoice duration elapses) — both redirects point at
          // the same order page, which just shows an accurate PENDING state + a working
          // "Bayar Sekarang" button either way, no separate failure page needed.
          success_redirect_url: `${origin}/order/${orderNumber}`,
          failure_redirect_url: `${origin}/order/${orderNumber}`,
        }),
      });

      if (!res.ok) {
        return status(502, { message: "Gagal membuat invoice pembayaran, silakan coba lagi" });
      }

      const invoice = (await res.json()) as { id: string; invoice_url: string };

      await order.update(record.id.id, {
        xenditInvoiceId: invoice.id,
        xenditInvoiceUrl: invoice.invoice_url,
      });

      return { orderNumber, invoiceUrl: invoice.invoice_url };
    },
    {
      body: z.object({
        customerName: z.string().min(1),
        customerEmail: z.email(),
        customerPhone: z.string().min(1),
        shippingAddress: z.string().min(1),
        destinationAreaId: z.number().int().positive(),
        destinationLabel: z.string().min(1),
        courier: z.string().min(1),
        service: z.string().min(1),
        items: z.array(z.object({ slug: z.string(), qty: z.number().int().positive() })).min(1),
      }),
    },
  )
  .post(
    "/webhook",
    async ({ body, headers }) => {
      // Xendit can't send a bearer token — this callback token header is the only auth.
      if (headers["x-callback-token"] !== XENDIT_CALLBACK_TOKEN) {
        return status(401, { message: "Invalid callback token" });
      }

      const externalId = body.external_id as string | undefined;
      const xenditStatus = body.status as string | undefined;
      if (!externalId || !xenditStatus) return { received: true };

      const newStatus = XENDIT_STATUS_MAP[xenditStatus];
      if (!newStatus) return { received: true };

      const result = await order.read({ filters: { orderNumber: { $eq: externalId } }, limit: 1 });
      const existing = result.data[0];
      if (!existing) return { received: true };

      await order.update(existing.id.id, {
        status: newStatus,
        ...(newStatus === "PAID" ? { paidAt: new Date().toISOString() } : {}),
      });

      return { received: true };
    },
    {
      headers: z.object({ "x-callback-token": z.string() }),
      body: z.record(z.string(), z.any()),
    },
  );
