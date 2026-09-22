import { route } from "@njinlabs/njin";
import { status } from "elysia";
import z from "zod";
import product from "../models/product";
import shippingVars from "../vars/shipping";
import internationalShippingRate from "../models/international-shipping-rate";
import { calculateCost, searchDestination } from "../services/rajaongkir";

export default route({ prefix: "/api/shipping" })
  .get(
    "/countries",
    async () => {
      // Admin-maintained flat-rate table (see src/models/international-shipping-rate.ts) —
      // one row per (country, weight band), so the same country can repeat several times.
      // 100 is njin's read() max limit; fine for the country-list use case this feeds.
      const result = await internationalShippingRate.read({ limit: 100, populate: "none" });
      const countries = [...new Set(result.data.map((r) => r.country))].sort((a, b) => a.localeCompare(b));
      return { data: countries };
    },
  )
  .post(
    "/quote-international",
    async ({ body }) => {
      // Same trust boundary as /quote below: weight is re-resolved from real product
      // records, never trusted from the client.
      let totalWeight = 0;

      for (const line of body.items) {
        const result = await product.read({
          filters: { slug: { $eq: line.slug }, status: { $eq: "PUBLISH" } },
          limit: 1,
          populate: "none",
        });
        const p = result.data[0];

        if (!p) {
          return status(422, { message: `Produk "${line.slug}" sudah tidak tersedia` });
        }

        totalWeight += p.weight * Math.max(1, Math.floor(line.qty));
      }

      const totalWeightKg = totalWeight / 1000;

      const rates = await internationalShippingRate.read({
        filters: { country: { $eq: body.country } },
        limit: 100,
        populate: "none",
      });
      const matched = rates.data.find((r) => totalWeightKg >= r.minWeight && totalWeightKg <= r.maxWeight);

      if (!matched) {
        return status(422, {
          message: `Belum ada tarif pengiriman internasional untuk ${body.country} dengan berat ${totalWeightKg.toFixed(2)} kg, silakan hubungi kami`,
        });
      }

      return { data: { country: body.country, weight: totalWeightKg, price: matched.price } };
    },
    {
      body: z.object({
        country: z.string().min(1),
        items: z.array(z.object({ slug: z.string(), qty: z.number().int().positive() })).min(1),
      }),
    },
  )
  .get(
    "/destinations",
    async ({ query }) => {
      const data = await searchDestination(query.search, query.limit);
      return { data };
    },
    {
      query: z.object({
        search: z.string().min(2),
        limit: z.coerce.number().int().positive().max(20).default(10),
      }),
    },
  )
  .post(
    "/quote",
    async ({ body }) => {
      const settings = await shippingVars.get();
      if (!settings.originAreaId) {
        return status(503, { message: "Pengiriman belum dikonfigurasi" });
      }

      // Weight is never trusted from the client either — same principle as price in
      // checkout.ts. Re-resolve every slug so a client-sent weight can't be used to
      // fish for a cheaper quote.
      let totalWeight = 0;

      for (const line of body.items) {
        const result = await product.read({
          filters: { slug: { $eq: line.slug }, status: { $eq: "PUBLISH" } },
          limit: 1,
          populate: "none",
        });
        const p = result.data[0];

        if (!p) {
          return status(422, { message: `Produk "${line.slug}" sudah tidak tersedia` });
        }

        totalWeight += p.weight * Math.max(1, Math.floor(line.qty));
      }

      const couriers = settings.couriers
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const data = await calculateCost({
        origin: settings.originAreaId,
        destination: body.destinationAreaId,
        weight: totalWeight,
        couriers,
      });

      return { data };
    },
    {
      body: z.object({
        destinationAreaId: z.number().int().positive(),
        items: z.array(z.object({ slug: z.string(), qty: z.number().int().positive() })).min(1),
      }),
    },
  );
