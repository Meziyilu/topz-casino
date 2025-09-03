// lib/validation.ts
import { z } from 'zod';

export const displayNameRegex = /^[\p{L}\p{N}_]{2,20}$/u;

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().regex(displayNameRegex, 'displayName must be 2-20 chars: letters/numbers/_'),
  referralCode: z.string().min(3).max(32).optional(),
  isOver18: z.boolean().refine(v => v === true, 'Must be over 18'),
  acceptTOS: z.boolean().refine(v => v === true, 'Must accept TOS'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ForgotSchema = z.object({
  email: z.string().email(),
});

export const ResetSchema = z.object({
  token: z.string().min(16),
  newPassword: z.string().min(8).max(72),
});

export const VerifySchema = z.object({
  token: z.string().min(16),
});
