import { route } from "@njinlabs/njin";
import { status } from "elysia";
import z from "zod";
import product from "../models/product";
import shippingVars from "../vars/shipping";
import { calculateCost, searchDestination } from "../services/rajaongkir";

export default route({ prefix: "/api/shipping" })
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
