// Shared RajaOngkir (Komerce) API client — plain TS module, not a njin extension
// point. Imported by src/routes/shipping.ts (quotes shown to the customer) and
// src/routes/checkout.ts (authoritative recompute right before invoicing).

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";
const API_KEY = process.env.RAJAONGKIR_API_KEY ?? "";

export type Destination = {
  id: number;
  label: string;
  province_name: string;
  city_name: string;
  district_name: string;
  subdistrict_name: string;
  zip_code: string;
};

export type CostOption = {
  name: string;
  code: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

export const searchDestination = async (search: string, limit = 10): Promise<Destination[]> => {
  const qs = new URLSearchParams({ search, limit: String(limit) });
  const res = await fetch(`${BASE_URL}/destination/domestic-destination?${qs.toString()}`, {
    headers: { key: API_KEY },
  });

  if (!res.ok) throw new Error(`RajaOngkir destination search failed (${res.status})`);

  const json = (await res.json()) as { data: Destination[] };
  return json.data ?? [];
};

// RajaOngkir wants application/x-www-form-urlencoded (stringified numbers) — the
// opposite convention from our own routes, which speak strict real-JSON-number
// bodies (njin's numeric() fields never coerce). Easy to mix up at this boundary.
const postCost = async (courier: string, params: { origin: number; destination: number; weight: number; price?: "lowest" | "highest" }) => {
  const body = new URLSearchParams({
    origin: String(params.origin),
    destination: String(params.destination),
    weight: String(params.weight),
    courier,
    ...(params.price ? { price: params.price } : {}),
  });

  const res = await fetch(`${BASE_URL}/calculate/domestic-cost`, {
    method: "POST",
    headers: { key: API_KEY, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error(`RajaOngkir cost calculation failed (${res.status})`);

  const json = (await res.json()) as { data: CostOption[] };
  return json.data ?? [];
};

export const calculateCost = async (params: {
  origin: number;
  destination: number;
  weight: number;
  couriers: string[];
  price?: "lowest" | "highest";
}): Promise<CostOption[]> => {
  // Confirmed live: RajaOngkir's domestic-cost endpoint accepts multiple courier codes
  // in one call when COLON-separated ("jne:jnt:sicepat") — comma-separated ("jne,jnt,...")
  // is rejected outright with a 422 "the valid courier is jne, sicepat, ..." (it tries to
  // parse the whole joined string as a single, invalid courier code). Still wrapped in a
  // try/catch + per-courier fallback below in case that batch behavior ever changes again.
  try {
    const joined = await postCost(params.couriers.join(":"), params);
    const gotCodes = new Set(joined.map((o) => o.code));
    const missing = params.couriers.filter((c) => !gotCodes.has(c));

    if (missing.length === 0) return joined;

    const extra = await Promise.all(missing.map((c) => postCost(c, params)));
    return [...joined, ...extra.flat()];
  } catch {
    // Batch call failed outright — fall back to one request per courier and merge
    // whatever succeeds, rather than failing the whole quote over one bad code.
    const results = await Promise.allSettled(params.couriers.map((c) => postCost(c, params)));
    return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  }
};
