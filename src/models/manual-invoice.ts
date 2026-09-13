import { makeModel, text, email, numeric, select, date } from "@njinlabs/njin";
import z from "zod";

const manualInvoice = makeModel("manualInvoice", {
  name: "Manual Invoice",
  searchFields: ["invoiceNumber", "customerName", "customerEmail"],
  schema: z.object({
    invoiceNumber: text({ label: "Invoice Number", unique: true, hideForm: true }, (z) => z.optional()),
    customerName: text({ label: "Customer Name" }),
    customerEmail: email({ label: "Customer Email" }),
    customerPhone: text({ label: "Customer Phone" }),
    description: text({ label: "Description" }),
    amount: numeric({ label: "Amount" }),
    status: select({ label: "Status", hideForm: true }, ["PENDING", "PAID", "EXPIRED", "FAILED"], (z) =>
      z.default("PENDING"),
    ),
    dokuTokenId: text({ label: "DOKU Token ID", hideForm: true }, (z) => z.optional()),
    dokuPaymentUrl: text({ label: "DOKU Payment URL", hideForm: true }, (z) => z.optional()),
    paidAt: date({ label: "Paid At", hideForm: true }, (z) => z.optional()),
  }),
});

export default manualInvoice;
