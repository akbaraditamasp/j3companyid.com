import { makeModel, text, richtext, numeric, select, object, array, file, multiFile, relation } from "@njinlabs/njin";
import z from "zod";
import brand from "./brand";
import category from "./category";

const product = makeModel("product", {
  name: "Product",
  searchFields: ["name", "sku", "category.name", "brand.name"],
  schema: z.object({
    name: text({ label: "Name" }),
    slug: text({ label: "Slug", unique: true, hideForm: true }, (z) => z.optional()),
    brand: relation({ label: "Brand", labelKey: "name" }, brand),
    category: relation({ label: "Category", labelKey: "name" }, category),
    sku: text({ label: "SKU", unique: true }),
    price: numeric({ label: "Price" }),
    compareAtPrice: numeric({ label: "Compare-at Price" }, (z) => z.optional()),
    weight: numeric({ label: "Weight (grams)" }, (z) => z.int().positive()),
    badge: text({ label: "Badge" }, (z) => z.optional()),
    rating: numeric({ label: "Rating" }, (z) => z.min(0).max(5).default(5)),
    reviewCount: numeric({ label: "Review Count" }, (z) => z.default(0)),
    availability: text({ label: "Availability" }, (z) => z.default("Tersedia — 1 unit")),
    description: richtext({ label: "Description" }),
    thumbnail: file({ label: "Thumbnail" }),
    gallery: multiFile({ label: "Gallery" }, (z) => z.optional()),
    specs: array(
      { label: "Specifications" },
      object({ label: "Spec" }, { label: text({ label: "Label" }), value: text({ label: "Value" }) }),
    ),
    status: select({ label: "Status" }, ["DRAFT", "PUBLISH"]),
  }),
});

export default product;
