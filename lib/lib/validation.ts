import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email();
export const passwordSchema = z.string().min(8).max(64)
  .refine(v => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), "需含大小寫與數字");
export const displayNameSchema = z.string().min(2).max(20)
  .regex(/^[\p{L}\p{N}_]+$/u, "僅限中英數與底線");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  referralCode: z.string().trim().toUpperCase().min(6).max(10).optional(),
  isOver18: z.boolean().refine(Boolean, "需滿 18 歲"),
  acceptTOS: z.boolean().refine(Boolean, "需同意條款"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});
