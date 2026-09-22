import { makeModel, text, numeric } from "@njinlabs/njin";
import z from "zod";

// Flat-rate table for shipments outside Indonesia. There's no courier API for
// international destinations here — cost differs per country and swings with
// the USD exchange rate — so an admin maintains bands of (country, weight
// range in kg) -> flat IDR price directly, adding/adjusting rows as new
// courier quotes come in. src/routes/shipping.ts and src/routes/checkout.ts
// both match the cart's total weight against these bands; unmatched weight
// (e.g. heavier than any configured band for that country) returns a 422
// rather than guessing a price.
const internationalShippingRate = makeModel("internationalShippingRate", {
  name: "International Shipping Rate",
  searchFields: ["country"],
  schema: z.object({
    country: text({ label: "Country" }),
    minWeight: numeric({ label: "Min Weight (kg)" }, (z) => z.nonnegative()),
    maxWeight: numeric({ label: "Max Weight (kg)" }, (z) => z.positive()),
    price: numeric({ label: "Price (IDR)" }, (z) => z.positive()),
  }),
});

export default internationalShippingRate;
