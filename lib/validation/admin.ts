import { z } from "zod";

export const upsertAnnouncementSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  enabled: z.boolean().optional().default(true),
  startAt: z.string().datetime().nullable().optional(), // ISO 字串
  endAt: z.string().datetime().nullable().optional(),
});

export type UpsertAnnouncementInput = z.infer<typeof upsertAnnouncementSchema>;

export const upsertMarqueeSchema = z.object({
  text: z.string().min(1).max(300),
  enabled: z.boolean().optional().default(true),
  priority: z.number().int().min(0).max(999).optional().default(0),
});

export type UpsertMarqueeInput = z.infer<typeof upsertMarqueeSchema>;
