import { makeModel, text, numeric, select } from "@njinlabs/njin";
import z from "zod";

const testimonial = makeModel("testimonial", {
  name: "Testimonial",
  searchFields: ["name", "quote"],
  schema: z.object({
    name: text({ label: "Nama" }),
    location: text({ label: "Lokasi" }),
    product: text({ label: "Produk" }),
    rating: numeric({ label: "Rating" }, (z) => z.min(1).max(5).default(5)),
    quote: text({ label: "Quote" }),
    status: select({ label: "Status" }, ["DRAFT", "PUBLISH"]),
  }),
});

export default testimonial;
