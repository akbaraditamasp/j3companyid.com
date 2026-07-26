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
    // Register your models here, e.g.:
    // () => import("./src/models/post"),
  ],
});
