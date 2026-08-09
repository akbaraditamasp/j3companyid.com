import { makeVars, text, array, object } from "@njinlabs/njin";
import z from "zod";

const siteContent = makeVars("siteContent", {
  name: "Site Content",
  schema: z.object({
    stats: array(
      { label: "Stats" },
      object({ label: "Stat" }, { value: text({ label: "Value" }), label: text({ label: "Label" }) }),
      (z) =>
        z.default([
          { value: "500+", label: "Produk Terkurasi" },
          { value: "3", label: "Negara Sumber" },
          { value: "2019", label: "Berdiri Sejak" },
        ]),
    ),
    trustBadges: array(
      { label: "Trust Badges" },
      object(
        { label: "Badge" },
        { icon: text({ label: "Icon (iconify name)" }), label: text({ label: "Label" }) },
      ),
      (z) =>
        z.default([
          { icon: "lucide:truck", label: "Free Shipping" },
          { icon: "lucide:badge-check", label: "Garansi Keaslian" },
          { icon: "lucide:rotate-ccw", label: "Retur 14 Hari" },
        ]),
    ),
  }),
});

export default siteContent;
