import { makeVars, text, numeric, plugin } from "@njinlabs/njin";
import z from "zod";

// originAreaId defaults to 0 as a deliberate "not configured yet" sentinel —
// src/routes/shipping.ts and src/routes/checkout.ts both refuse to call RajaOngkir
// with a bogus origin and return 503 instead until an admin sets a real one.
// Admin edits it through the "rajaongkir:destination" picker (src/rajaongkir/admin);
// originLabel is overwritten on save by src/hooks/rajaongkir-label.ts when an address was picked.
const shipping = makeVars("shipping", {
  name: "Shipping",
  schema: z.object({
    originAreaId: plugin(
      numeric({ label: "Origin Address" }, (z) => z.int().default(0)),
      ["rajaongkir:destination", { labelField: "originLabel" }],
    ),
    originLabel: text({ label: "Origin Label" }, (z) => z.optional()),
    couriers: text(
      { label: "Enabled Couriers (comma-separated codes, e.g. jne,jnt,sicepat)" },
      (z) => z.default("jne,jnt,sicepat"),
    ),
  }),
});

export default shipping;
