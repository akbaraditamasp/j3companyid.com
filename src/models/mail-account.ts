import { boolean, date, makeModel, numeric, select, text } from "@njinlabs/njin";
import z from "zod";

const mailAccount = makeModel("mailAccount", {
  name: "Mail Account",
  searchFields: ["username", "name"],
  schema: z.object({
    // Local-part only — no "@" allowed. Full email is derived by
    // src/hooks/mail-account.ts as `${username}@${STALWART_DOMAIN}`, so the
    // domain can never be chosen by whoever submits the form/API request.
    username: text({ label: "Username", unique: true }, (z) =>
      z.regex(/^[a-z0-9._-]+$/i, "Hanya huruf, angka, titik, underscore, dan dash — tanpa @ atau domain").min(1),
    ),
    // Read-only in practice — always overwritten by the beforeCreate/beforeUpdate
    // hooks regardless of what's submitted here.
    email: text({ label: "Email", unique: true }, (z) => z.optional()),
    name: text({ label: "Nama" }, (z) => z.optional()),
    password: text({ label: "Password" }, (z) => z.optional()),
    quota: numeric({ label: "Quota (bytes)" }, (z) => z.optional()),
    status: select({ label: "Status" }, ["ACTIVE", "DISABLED"]),
    stalwartId: text({ label: "Stalwart ID", unique: true }, (z) => z.optional()),
    passwordDirty: boolean({ label: "Password Dirty" }, (z) => z.default(false)),
    lastSyncedAt: date({ label: "Terakhir Sync" }, (z) => z.optional()),
  }),
});

export default mailAccount;
