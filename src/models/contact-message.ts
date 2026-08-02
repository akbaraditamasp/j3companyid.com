import { makeModel, text, email, select } from "@njinlabs/njin";
import z from "zod";

const contactMessage = makeModel("contactMessage", {
  name: "Contact Message",
  searchFields: ["name", "email", "message"],
  schema: z.object({
    name: text({ label: "Name" }),
    email: email({ label: "Email" }),
    phone: text({ label: "Phone" }, (z) => z.optional()),
    message: text({ label: "Message" }),
    status: select({ label: "Status" }, ["NEW", "DONE"], (z) => z.default("NEW")),
  }),
});

export default contactMessage;
