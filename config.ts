import { defineConfig } from "@njinlabs/njin/config";
import bunFilesystemAdapter from "@njinlabs/njin/adapters/bun_filesystem";

export default defineConfig({
  port: Number(process.env.PORT ?? 3000),
  db: {
    path: process.env.DB_PATH ?? "rocksdb://data",
    namespace: process.env.DB_NAMESPACE ?? "general",
    database: process.env.DB_DATABASE ?? "general",
  },
  img: {
    hosts: process.env.IMG_HOSTS
      ? process.env.IMG_HOSTS.split(",").map((h) => h.trim()).filter(Boolean)
      : [],
  },
  adapters: {
    file: bunFilesystemAdapter({ dir: "./uploads" }),
  },
  models: [
    () => import("./src/models/brand"),
    () => import("./src/models/category"),
    () => import("./src/models/product"),
    () => import("./src/models/order"),
    () => import("./src/models/contact-message"),
  ],
  routes: [
    () => import("./src/routes/checkout"),
    () => import("./src/routes/shipping"),
    () => import("./src/routes/contact"),
  ],
  vars: [
    () => import("./src/vars/checkout"),
    () => import("./src/vars/shipping"),
  ],
});
