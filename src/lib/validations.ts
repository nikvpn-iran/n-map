import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1, "نام اکانت الزامی است"),
  platform: z.string().min(1, "پلتفرم الزامی است"),
  token: z.string().min(1, "توکن دسترسی الزامی است"),
  email: z.string().email("ایمیل معتبر نیست").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const updateAccountSchema = createAccountSchema.partial();

export const createNodeSchema = z.object({
  name: z.string().min(1, "نام نود الزامی است"),
  ip: z.string().min(1, "آی‌پی الزامی است"),
  port: z.coerce.number().int().min(1).max(65535),
  type: z.string().default("vless"),
  configLink: z.string().optional().or(z.literal("")),
  accountId: z.string().min(1, "اکانت الزامی است"),
});

export const createSubLinkSchema = z.object({
  name: z.string().min(1, "نام لینک الزامی است"),
  url: z.string().url("آدرس URL معتبر نیست"),
  trafficLimit: z.coerce.number().min(0).default(0),
  trafficUsed: z.coerce.number().min(0).default(0),
  expiresAt: z.string().optional().or(z.literal("")),
  accountId: z.string().min(1, "اکانت الزامی است"),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type CreateNodeInput = z.infer<typeof createNodeSchema>;
export type CreateSubLinkInput = z.infer<typeof createSubLinkSchema>;
