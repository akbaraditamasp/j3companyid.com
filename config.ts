import { defineConfig } from "@njinlabs/njin/config";
import s3Adapter from "@njinlabs/njin/adapters/s3";

export default defineConfig({
  port: Number(process.env.PORT ?? 3000),
  db: {
    path: process.env.DB_PATH ?? "rocksdb://data",
    namespace: process.env.DB_NAMESPACE ?? "general",
    database: process.env.DB_DATABASE ?? "general",
    auth: process.env.DB_TOKEN
      ? process.env.DB_TOKEN
      : process.env.DB_USERNAME && process.env.DB_PASSWORD
        ? { username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD }
        : undefined,
  },
  img: {
    hosts: process.env.IMG_HOSTS
      ? process.env.IMG_HOSTS.split(",").map((h) => h.trim()).filter(Boolean)
      : [],
  },
  adapters: {
    file: s3Adapter({
      bucket: process.env.S3_BUCKET!,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      endpoint: process.env.S3_ENDPOINT,
      publicUrl: process.env.S3_PUBLIC_URL,
    }),
  },
  models: [
    () => import("./src/models/brand"),
    () => import("./src/models/category"),
    () => import("./src/models/product"),
    () => import("./src/models/order"),
    () => import("./src/models/contact-message"),
    () => import("./src/models/testimonial"),
    () => import("./src/models/hero-slide"),
    () => import("./src/models/mail-account"),
  ],
  hooks: [() => import("./src/hooks/mail-account")],
  routes: [
    () => import("./src/routes/checkout"),
    () => import("./src/routes/shipping"),
    () => import("./src/routes/contact"),
    () => import("./src/routes/sitemap"),
    () => import("./src/routes/robots"),
    () => import("./src/routes/stalwart-sync"),
  ],
  vars: [
    () => import("./src/vars/checkout"),
    () => import("./src/vars/shipping"),
    () => import("./src/vars/contact"),
    () => import("./src/vars/site-content"),
  ],
  helpers: [() => import("./src/helpers/site-url"), () => import("./src/helpers/json-ld")],
});
