import { defineAdminPlugin } from "@njinlabs/njin-admin/sdk";
import "./index.css";
import { DestinationField } from "./destination-field";

// Server side marks a numeric id field with:
//   plugin(numeric(...), ["rajaongkir:destination", { labelField: "originLabel" }])
export default defineAdminPlugin({
  name: "rajaongkir",
  fields: { destination: DestinationField },
});
