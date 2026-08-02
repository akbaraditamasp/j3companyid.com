#!/usr/bin/env node
// Standalone seed script — pushes the J3 Company dummy catalog (brand, category,
// product) that currently lives hardcoded in src/views/pages/*.edge into the real
// njin API over HTTP. Talks only to the public REST API, so it works against any
// environment (local dev now, production later) — just point NJIN_BASE_URL at it.
//
// Safe to re-run: every brand/category/product is looked up by its unique field
// (slug / sku) before creating, so running this twice against the same database
// just skips what's already there instead of erroring or duplicating.
//
// Usage:
//   NJIN_BASE_URL=http://localhost:3000 NJIN_EMAIL=admin@example.com NJIN_PASSWORD=secret node scripts/seed-catalog.mjs
//
// Env vars:
//   NJIN_BASE_URL    Target njin server, no trailing slash (default: http://localhost:3000)
//   NJIN_EMAIL       Admin login email (required)
//   NJIN_PASSWORD    Admin login password (required)
//   NJIN_STATIC_DIR  Folder holding the source images (default: <repo>/static, resolved
//                    relative to this script so it works regardless of cwd)

import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = (process.env.NJIN_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const EMAIL = process.env.NJIN_EMAIL;
const PASSWORD = process.env.NJIN_PASSWORD;
const STATIC_DIR = process.env.NJIN_STATIC_DIR ?? fileURLToPath(new URL("../static", import.meta.url));

if (!EMAIL || !PASSWORD) {
  console.error("Missing NJIN_EMAIL / NJIN_PASSWORD env vars.");
  process.exit(1);
}

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// --- Source data — transcribed from src/views/pages/index.edge and shop/[slug].edge ---

const BRANDS = ["Red Wing", "RM Williams", "Alden", "Wolverine", "Viberg", "Thorogood", "Filson"].map((name) => ({
  name,
  slug: slugify(name),
}));

const CATEGORIES = [
  { name: "Work Boots", image: "categories/workboots.jpg" },
  { name: "Chelsea & Dress", image: "categories/chelsea.jpg" },
  { name: "Vintage Archive", image: "categories/archive.jpg" },
  { name: "Outerwear & Denim", image: "categories/outerwear.jpg" },
  { name: "Bags & Leather Goods", image: "categories/bags.jpg" },
  { name: "Watches & Jewelry", image: "categories/watch.jpg" },
].map((c) => ({ ...c, slug: slugify(c.name) }));

const PRODUCTS = [
  {
    slug: "red-wing-iron-ranger",
    brand: "Red Wing",
    name: "Iron Ranger Boot",
    category: "Work Boots",
    price: 4850000,
    weight: 1600,
    compareAtPrice: null,
    badge: "New",
    image: "products/red-wing-iron-ranger.jpg",
    rating: 5,
    reviewCount: 32,
    sku: "RW-8085-IR",
    availability: "Tersedia — 1 unit",
    description:
      "Goodyear-welted boot dengan Amber Harness leather yang makin karakter seiring dipakai. Toe cap baja ringan dan sol Vibram 430 bikin Iron Ranger tahan banting untuk pemakaian harian maupun kerja lapangan.",
    specs: [
      { label: "Material", value: "Amber Harness Leather" },
      { label: "Ukuran", value: "US 9 / EU 42" },
      { label: "Kondisi", value: "Baru (BNIB)" },
      { label: "Konstruksi", value: "Goodyear Welt" },
      { label: "Sol", value: "Vibram 430 Mini-Lug" },
      { label: "Dibuat di", value: "Minnesota, USA" },
    ],
  },
  {
    slug: "rm-williams-craftsman",
    brand: "RM Williams",
    name: "Craftsman Chelsea",
    category: "Chelsea & Dress",
    price: 5200000,
    weight: 1400,
    compareAtPrice: null,
    badge: null,
    image: "products/rm-williams-craftsman.jpg",
    rating: 5,
    reviewCount: 21,
    sku: "RMW-CR-001",
    availability: "Tersedia — 1 unit",
    description:
      "Dipotong dari satu lembar kulit tanpa jahitan samping — signature RM Williams sejak 1932. Craftsman cocok dipakai formal maupun kasual, dari kantor sampai akhir pekan.",
    specs: [
      { label: "Material", value: "One-Piece Leather" },
      { label: "Ukuran", value: "US 9 / EU 42" },
      { label: "Kondisi", value: "Baru (BNIB)" },
      { label: "Konstruksi", value: "Cuban Heel, Leather Sole" },
      { label: "Dibuat di", value: "Adelaide, Australia" },
    ],
  },
  {
    slug: "alden-indy",
    brand: "Alden",
    name: "Indy Boot",
    category: "Work Boots",
    price: 6400000,
    weight: 1600,
    compareAtPrice: null,
    badge: "Limited",
    image: "products/alden-indy.jpg",
    rating: 5,
    reviewCount: 14,
    sku: "ALD-403-IND",
    availability: "Tersedia — 1 unit",
    description:
      "Indy Boot berbahan Brown Chromexcel dengan plain toe klasik — salah satu silhouette paling dicari dari Alden. Dibuat terbatas, stok tidak selalu tersedia.",
    specs: [
      { label: "Material", value: "Brown Chromexcel Leather" },
      { label: "Ukuran", value: "US 9.5 / EU 42.5" },
      { label: "Kondisi", value: "Baru (BNIB)" },
      { label: "Konstruksi", value: "Goodyear Welt, Crepe Sole" },
      { label: "Dibuat di", value: "Massachusetts, USA" },
    ],
  },
  {
    slug: "wolverine-1000-mile",
    brand: "Wolverine",
    name: "1000 Mile Boot",
    category: "Work Boots",
    price: 3950000,
    weight: 1500,
    compareAtPrice: null,
    badge: null,
    image: "products/wolverine-1000-mile.jpg",
    rating: 4,
    reviewCount: 18,
    sku: "WLV-1000M",
    availability: "Tersedia — 1 unit",
    description:
      "Warisan sejak 1914 — 1000 Mile Boot dibuat dari kulit tebal berkualitas tinggi dengan konstruksi yang dirancang untuk bertahan ribuan mil pemakaian.",
    specs: [
      { label: "Material", value: "Full-Grain Leather" },
      { label: "Ukuran", value: "US 9 / EU 42" },
      { label: "Kondisi", value: "Baru (BNIB)" },
      { label: "Konstruksi", value: "Goodyear Welt" },
      { label: "Dibuat di", value: "Amerika Serikat" },
    ],
  },
  {
    slug: "viberg-service",
    brand: "Viberg",
    name: "Service Boot",
    category: "Work Boots",
    price: 7800000,
    weight: 1700,
    compareAtPrice: null,
    badge: null,
    image: "products/viberg-service.jpg",
    rating: 5,
    reviewCount: 9,
    sku: "VBG-2030-SB",
    availability: "Tersedia — 1 unit",
    description:
      "Dibuat tangan di Kanada, Service Boot dari Viberg adalah standar emas boot heritage — konstruksi presisi dan material grade militer.",
    specs: [
      { label: "Material", value: "Full-Grain Leather" },
      { label: "Ukuran", value: "US 9 / EU 42" },
      { label: "Kondisi", value: "Baru (BNIB)" },
      { label: "Konstruksi", value: "Goodyear Welt, Dainite Sole" },
      { label: "Dibuat di", value: "British Columbia, Kanada" },
    ],
  },
  {
    slug: "thorogood-moc-toe",
    brand: "Thorogood",
    name: "Moc Toe Boot",
    category: "Work Boots",
    price: 3200000,
    weight: 1500,
    compareAtPrice: 3800000,
    badge: null,
    image: "products/thorogood-moc-toe.jpg",
    rating: 4,
    reviewCount: 27,
    sku: "THG-814-MT",
    availability: "Tersedia — 1 unit",
    description:
      "Moc Toe klasik Amerika dengan harga lebih bersahabat tanpa mengorbankan kualitas konstruksi. Cocok untuk yang baru mulai koleksi work boots.",
    specs: [
      { label: "Material", value: "Full-Grain Leather" },
      { label: "Ukuran", value: "US 9 / EU 42" },
      { label: "Kondisi", value: "Baru (BNIB)" },
      { label: "Konstruksi", value: "Goodyear Welt, Vibram 430" },
      { label: "Dibuat di", value: "Wisconsin, USA" },
    ],
  },
  {
    slug: "filson-mackinaw-jacket",
    brand: "Filson",
    name: "Mackinaw Wool Jacket",
    category: "Outerwear & Denim",
    price: 5600000,
    weight: 1200,
    compareAtPrice: null,
    badge: "New",
    image: "products/jacket.jpg",
    rating: 5,
    reviewCount: 11,
    sku: "FIL-MK-JKT",
    availability: "Tersedia — 1 unit",
    description:
      "Wol Mackinaw setebal 26oz dari Filson dirancang untuk menahan dingin ekstrem. Potongan klasik yang tidak lekang zaman, dibuat untuk dipakai puluhan tahun.",
    specs: [
      { label: "Material", value: "100% Virgin Wool, 26oz" },
      { label: "Ukuran", value: "L" },
      { label: "Kondisi", value: "Baru (BNIB)" },
      { label: "Detail", value: "Kancing Tanduk Asli" },
      { label: "Dibuat di", value: "Seattle, USA" },
    ],
  },
  {
    slug: "rm-williams-leather-belt",
    brand: "RM Williams",
    name: "Leather Belt",
    category: "Bags & Leather Goods",
    price: 1850000,
    weight: 300,
    compareAtPrice: null,
    badge: null,
    image: "products/rm-williams-leather-belt.jpg",
    rating: 5,
    reviewCount: 16,
    sku: "RMW-BLT-01",
    availability: "Tersedia — 1 unit",
    description:
      "Sabuk kulit yang dibuat dengan standar sama seperti sepatu RM Williams — kokoh, minim ornamen, dan makin bagus seiring waktu.",
    specs: [
      { label: "Material", value: "Full-Grain Leather" },
      { label: "Ukuran", value: "90 cm" },
      { label: "Kondisi", value: "Baru (BNIB)" },
      { label: "Gesper", value: "Solid Brass" },
      { label: "Dibuat di", value: "Adelaide, Australia" },
    ],
  },
];

// --- HTTP helpers ---

let token;

const api = async (path, { method = "GET", body, isForm = false } = {}) => {
  const headers = { Authorization: `Bearer ${token}` };
  if (!isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }

  return json;
};

const login = async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Login failed → ${res.status}: ${await res.text()}`);
  }

  const { data } = await res.json();
  token = data.token;
};

// RecordId comes back over JSON as "table:id" — relation fields expect just the
// bare id part (see njin's relation() preprocess: a raw string is treated as the id).
const localId = (fullId) => fullId.slice(fullId.indexOf(":") + 1);

const findOneBy = async (prefix, field, value) => {
  const qs = new URLSearchParams({ [`filters[${field}]`]: value, limit: "1" });
  const { data } = await api(`/api/${prefix}?${qs.toString()}`);
  return data[0];
};

const uploadImage = async (relativePath) => {
  const absPath = join(STATIC_DIR, relativePath);
  const bytes = await readFile(absPath);
  const form = new FormData();
  form.append("file", new Blob([bytes]), basename(relativePath));

  // POST /api/file returns { data: [{...}] } — an array, unlike every other create endpoint.
  const { data } = await api("/api/file", { method: "POST", isForm: true, body: form });
  return localId((Array.isArray(data) ? data[0] : data).id);
};

// Creates the record if none exists with the given unique field/value, uploading
// `imagePath` (if provided) only when a create actually happens. Returns the local id.
const upsert = async (prefix, uniqueField, uniqueValue, buildBody, imagePath, imageField) => {
  const existing = await findOneBy(prefix, uniqueField, uniqueValue);
  if (existing) {
    console.log(`  = ${prefix} "${uniqueValue}" already exists — skipping`);
    return localId(existing.id.toString());
  }

  const body = await buildBody();
  if (imagePath) body[imageField] = await uploadImage(imagePath);

  const { data } = await api(`/api/${prefix}`, { method: "POST", body });
  console.log(`  + created ${prefix} "${uniqueValue}"`);
  return localId(data.id.toString());
};

// --- Main ---

const main = async () => {
  console.log(`Seeding catalog into ${BASE_URL} ...`);
  await login();

  console.log("\nBrands:");
  const brandIdByName = {};
  for (const brand of BRANDS) {
    brandIdByName[brand.name] = await upsert("brand", "slug", brand.slug, () => ({
      name: brand.name,
      slug: brand.slug,
    }));
  }

  console.log("\nCategories:");
  const categoryIdByName = {};
  for (const category of CATEGORIES) {
    categoryIdByName[category.name] = await upsert(
      "category",
      "slug",
      category.slug,
      () => ({ name: category.name, slug: category.slug }),
      category.image,
      "image",
    );
  }

  console.log("\nProducts:");
  for (const product of PRODUCTS) {
    await upsert(
      "product",
      "slug",
      product.slug,
      () => {
        const body = {
          name: product.name,
          slug: product.slug,
          brand: brandIdByName[product.brand],
          category: categoryIdByName[product.category],
          sku: product.sku,
          price: product.price,
          weight: product.weight,
          rating: product.rating,
          reviewCount: product.reviewCount,
          availability: product.availability,
          description: product.description,
          specs: product.specs,
          status: "PUBLISH",
        };
        if (product.compareAtPrice != null) body.compareAtPrice = product.compareAtPrice;
        if (product.badge) body.badge = product.badge;
        return body;
      },
      product.image,
      "thumbnail",
    );
  }

  console.log("\nDone.");
};

main().catch((err) => {
  console.error("\nSeed failed:", err.message ?? err);
  process.exit(1);
});
