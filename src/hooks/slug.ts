import { beforeCreate, beforeUpdate } from "@njinlabs/njin";
import brand from "../models/brand";
import category from "../models/category";
import product from "../models/product";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Finds the first slug in {base, base-2, base-3, ...} not already used by another
// record — same collision strategy the API's `unique: true` check would otherwise
// just reject with a 409, except here we resolve it instead of failing the request.
const uniqueSlug = async (
  model: typeof brand | typeof category | typeof product,
  base: string,
  excludeId?: string,
) => {
  let candidate = base;
  let suffix = 1;

  while (true) {
    const { data } = await model.read({ filters: { slug: candidate }, limit: 1, populate: "none" });
    const collision = data.find((row) => row.id.id !== excludeId);
    if (!collision) return candidate;

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
};

const register = (model: typeof brand | typeof category | typeof product) => {
  beforeCreate(model, async (data) => {
    if (!data.name) return;
    return { slug: await uniqueSlug(model, slugify(data.name)) };
  });

  beforeUpdate(model, async (data, { id }) => {
    if (!data.name) return;
    return { slug: await uniqueSlug(model, slugify(data.name), id) };
  });
};

register(brand);
register(category);
register(product);
