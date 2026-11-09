import { beforeUpdate, beforeVarsUpdate } from "@njinlabs/njin";
import order from "../models/order";
import shippingVars from "../vars/shipping";
import { cachedDestinationLabel } from "../services/rajaongkir";

// The admin's "rajaongkir:destination" picker only submits the destination id; the readable
// label lives in a hideForm field the form never sees, so it is filled here from the labels
// the destination search just returned. Cache miss (e.g. server restarted between search
// and save) -> the previous label is kept rather than blanked.
beforeVarsUpdate(shippingVars, (data) => {
  if (typeof data.originAreaId !== "number") return;
  // 0 = the admin cleared the address: drop the stale label with it.
  if (data.originAreaId === 0) return { originLabel: "" };
  const label = cachedDestinationLabel(data.originAreaId);
  if (label) return { originLabel: label };
});

beforeUpdate(order, (data) => {
  if (typeof data.shippingDestinationId !== "number") return;
  if (data.shippingDestinationId === 0) return { shippingDestinationLabel: "" };
  const label = cachedDestinationLabel(data.shippingDestinationId);
  if (label) return { shippingDestinationLabel: label };
});
