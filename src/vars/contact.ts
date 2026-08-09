import { makeVars, text, email } from "@njinlabs/njin";
import z from "zod";

const contact = makeVars("contact", {
  name: "Contact Info",
  schema: z.object({
    address: text({ label: "Alamat" }, (z) => z.default("Jl. Sudirman No. 123, Jakarta Pusat, 10220")),
    operatingHours: text({ label: "Jam Operasional" }, (z) => z.default("Senin – Jumat, 09.00 – 17.00 WIB")),
    email: email({ label: "Email" }, (z) => z.default("cs@j3companyid.com")),
    whatsappNumber: text({ label: "Nomor WhatsApp (format 62xxx, tanpa +)" }, (z) => z.default("6281234567890")),
    instagramUrl: text({ label: "Instagram URL" }, (z) => z.optional()),
    youtubeUrl: text({ label: "YouTube URL" }, (z) => z.optional()),
  }),
});

export default contact;
