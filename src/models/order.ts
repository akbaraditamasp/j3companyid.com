import { makeModel, text, email, numeric, select, object, array, date } from "@njinlabs/njin";
import z from "zod";

const order = makeModel("order", {
  name: "Order",
  searchFields: ["orderNumber", "customerEmail", "customerName"],
  schema: z.object({
    orderNumber: text({ label: "Order Number", unique: true }),
    customerName: text({ label: "Customer Name" }),
    customerEmail: email({ label: "Customer Email" }),
    customerPhone: text({ label: "Customer Phone" }),
    shippingAddress: text({ label: "Shipping Address" }),
    items: array(
      { label: "Items" },
      object({ label: "Item" }, {
        productSlug: text({ label: "Product Slug" }),
        name: text({ label: "Name" }),
        brand: text({ label: "Brand" }),
        price: numeric({ label: "Price" }),
        qty: numeric({ label: "Qty" }),
        subtotal: numeric({ label: "Subtotal" }),
      }),
    ),
    subtotal: numeric({ label: "Subtotal" }),
    shippingCost: numeric({ label: "Shipping Cost" }, (z) => z.default(0)),
    shippingDestinationId: numeric({ label: "Shipping Destination ID" }, (z) => z.optional()),
    shippingDestinationLabel: text({ label: "Shipping Destination Label" }, (z) => z.optional()),
    shippingCourier: text({ label: "Shipping Courier" }, (z) => z.optional()),
    shippingService: text({ label: "Shipping Service" }, (z) => z.optional()),
    shippingEtd: text({ label: "Estimated Delivery" }, (z) => z.optional()),
    total: numeric({ label: "Total" }),
    status: select({ label: "Status" }, ["PENDING", "PAID", "EXPIRED", "FAILED"]),
    paymentGateway: select({ label: "Payment Gateway" }, ["XENDIT", "DOKU"], (z) => z.default("XENDIT")),
    xenditInvoiceId: text({ label: "Xendit Invoice ID", hideForm: true }, (z) => z.optional()),
    xenditInvoiceUrl: text({ label: "Xendit Invoice URL", hideForm: true }, (z) => z.optional()),
    dokuTokenId: text({ label: "DOKU Token ID", hideForm: true }, (z) => z.optional()),
    dokuPaymentUrl: text({ label: "DOKU Payment URL", hideForm: true }, (z) => z.optional()),
    paidAt: date({ label: "Paid At" }, (z) => z.optional()),
  }),
});

export default order;
