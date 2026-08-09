import { makeModel, text, numeric, select, file } from "@njinlabs/njin";
import z from "zod";

const heroSlide = makeModel("heroSlide", {
  name: "Hero Slide",
  searchFields: ["title", "eyebrow"],
  schema: z.object({
    image: file({ label: "Image" }),
    alt: text({ label: "Alt Text" }),
    eyebrow: text({ label: "Eyebrow" }),
    title: text({ label: "Title" }),
    subtitle: text({ label: "Subtitle" }),
    ctaText: text({ label: "CTA Text" }),
    ctaHref: text({ label: "CTA Link" }),
    order: numeric({ label: "Order" }, (z) => z.int().default(0)),
    status: select({ label: "Status" }, ["DRAFT", "PUBLISH"]),
  }),
});

export default heroSlide;
