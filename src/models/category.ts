import { makeModel, text, file } from "@njinlabs/njin";
import z from "zod";

const category = makeModel("category", {
  name: "Category",
  searchFields: ["name"],
  schema: z.object({
    name: text({ label: "Name" }),
    slug: text({ label: "Slug", unique: true }),
    image: file({ label: "Image" }, (z) => z.optional()),
  }),
});

export default category;
