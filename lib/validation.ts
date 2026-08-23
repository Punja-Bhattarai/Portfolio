import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(4000),
  website: z.string().max(0).optional(), // honeypot – must stay empty
});

export const photoUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  album_id: z.string().uuid().nullable().optional(),
});

export const albumCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).optional(),
  visibility: z.enum(["public", "guest"]).default("guest"),
});

export const albumUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(600).optional(),
  visibility: z.enum(["public", "guest"]).optional(),
  cover_photo_id: z.string().uuid().nullable().optional(),
});

export const projectCreateSchema = z.object({
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).default(""),
  long_description: z.string().trim().max(4000).optional(),
  technologies: z.array(z.string().trim().max(40)).max(20).default([]),
  features: z.array(z.string().trim().max(120)).max(15).default([]),
  github_url: z.string().trim().url().max(300).or(z.literal("")).optional(),
  demo_url: z.string().trim().url().max(300).or(z.literal("")).optional(),
  video_url: z.string().trim().url().max(300).or(z.literal("")).optional(),
  image_path: z.string().trim().max(400).optional(),
  category: z.enum(["project", "lab"]).default("project"),
  status: z.string().trim().max(40).default("completed"),
  featured: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const guestCreateSchema = z.object({
  kind: z.literal("guest"),
  name: z.string().trim().min(1).max(100),
  album_ids: z.array(z.string().uuid()).max(50),
  download: z.boolean().default(false),
  expires_days: z.number().int().min(1).max(365).nullable().default(null),
});

export const linkCreateSchema = z.object({
  kind: z.literal("link"),
  name: z.string().trim().min(1).max(100),
  album_id: z.string().uuid().nullable(),
  require_password: z.boolean().default(true),
  download_allowed: z.boolean().default(false),
  expires_days: z.number().int().min(1).max(365).nullable().default(null),
});

export const accessRevokeSchema = z.object({
  kind: z.enum(["guest", "link"]),
  id: z.string().uuid(),
});

export const galleryAccessSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("guest"),
    access_name: z.string().trim().min(1).max(100),
    password: z.string().min(1).max(200),
  }),
  z.object({
    mode: z.literal("link"),
    slug: z.string().trim().min(1).max(80),
    password: z.string().max(200).optional(),
  }),
]);

export const settingsPutSchema = z.object({
  keys: z.record(z.string(), z.unknown()),
});

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

export function safeText(v: unknown, fallback = ""): string {
  if (typeof v !== "string") return fallback;
  // strip control chars except newline/tab
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}
