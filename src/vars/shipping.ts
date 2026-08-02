import { makeVars, text, numeric } from "@njinlabs/njin";
import z from "zod";

// originAreaId defaults to 0 as a deliberate "not configured yet" sentinel —
// src/routes/shipping.ts and src/routes/checkout.ts both refuse to call RajaOngkir
// with a bogus origin and return 503 instead until an admin sets a real one.
// To find the value: GET /api/shipping/destinations?search=<your city> and copy
// the "id" of the matching result — there's no admin-panel widget for this since
// _admin/ is a prebuilt SPA with no source in this project to extend.
const shipping = makeVars("shipping", {
  name: "Shipping",
  schema: z.object({
    originAreaId: numeric(
      { label: "Origin Area ID — lookup: GET /api/shipping/destinations?search=<your city>" },
      (z) => z.int().default(0),
    ),
    originLabel: text({ label: "Origin Label (display only)" }, (z) => z.optional()),
    couriers: text(
      { label: "Enabled Couriers (comma-separated codes, e.g. jne,jnt,sicepat)" },
      (z) => z.default("jne,jnt,sicepat"),
    ),
  }),
});

export default shipping;
