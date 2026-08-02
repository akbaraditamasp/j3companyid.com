import { makeVars, text, boolean } from "@njinlabs/njin";
import z from "zod";

const checkout = makeVars("checkout", {
  name: "Checkout",
  schema: z.object({
    enabled: boolean({ label: "Checkout Enabled" }, (z) => z.default(true)),
    shippingNotice: text({ label: "Shipping Notice" }, (z) =>
      z.default("Ongkos kirim dihitung otomatis berdasarkan berat produk dan kota tujuan."),
    ),
    invoiceDescription: text({ label: "Invoice Description Prefix" }, (z) => z.default("J3 Company Order")),
  }),
});

export default checkout;
