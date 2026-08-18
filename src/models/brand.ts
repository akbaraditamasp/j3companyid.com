import { makeModel, text, file, boolean } from "@njinlabs/njin";
import z from "zod";

const brand = makeModel("brand", {
  name: "Brand",
  searchFields: ["name"],
  schema: z.object({
    name: text({ label: "Name" }),
    slug: text({ label: "Slug", unique: true }),
    logo: file({ label: "Logo" }, (z) => z.optional()),
    featuredOnHomepage: boolean({ label: "Show on Homepage" }, (z) => z.default(false)),
  }),
});

export default brand;
