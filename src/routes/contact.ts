import { route } from "@njinlabs/njin";
import z from "zod";
import contactMessage from "../models/contact-message";

export default route({ prefix: "/api/contact" }).post(
  "/",
  async ({ body }) => {
    const record = await contactMessage.create({ ...body, status: "NEW" });
    return { data: record };
  },
  {
    body: z.object({
      name: z.string().min(1),
      email: z.email(),
      phone: z.string().optional(),
      message: z.string().min(10),
    }),
  },
);
