import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase";

export const ADMIN_COOKIE = "pb_admin";
export const GALLERY_COOKIE = "pb_gallery";

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
}

export interface GalleryPermissions {
  view: boolean;
  download: boolean;
}

export interface GallerySession {
  jti: string;
  subject_type: "guest" | "link";
  subject_id: string;
  permissions: GalleryPermissions;
  expires_at: string;
  name?: string | null;
}

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  return new TextEncoder().encode(
    s && s.length >= 16 ? s : "insecure-dev-secret-change-me-please!"
  );
}

function isSecure(req: NextRequest): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https"
  );
}

export function setSessionCookie(
  res: NextResponse,
  name: string,
  value: string,
  maxAgeSeconds: number,
  req?: NextRequest
): void {
  res.cookies.set({
    name,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: req ? isSecure(req) : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(res: NextResponse, name: string): void {
  res.cookies.set({
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });
}

// ── Admin auth ────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Generates a cryptographically strong password, e.g. "K7m#pQz2!vRn9xWd" */
export function generatePassword(length = 16): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  // guarantee at least one digit and one symbol class presence
  if (!/[0-9]/.test(out)) out = out.slice(0, -1) + "7";
  return out;
}

export async function createAdminToken(user: {
  id: string;
  email: string;
  token_version: number;
}): Promise<{ token: string; maxAge: number }> {
  const days = Number(process.env.ADMIN_SESSION_DAYS || 7);
  const maxAge = Math.max(1, Math.min(days, 30)) * 24 * 60 * 60;
  const token = await new SignJWT({
    role: "admin",
    tv: user.token_version,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${Math.floor(maxAge / 86400)}d`)
    .sign(getSecret());
  return { token, maxAge };
}

export async function getAdminUser(req: NextRequest): Promise<AdminUser | null> {
  const raw = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, getSecret());
    if (payload.role !== "admin" || typeof payload.sub !== "string") return null;
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from("profiles")
      .select("id, email, display_name, token_version")
      .eq("id", payload.sub)
      .single();
    if (!data) return null;
    if (data.token_version !== payload.tv) return null; // password changed / logged out everywhere
    return { id: data.id, email: data.email, display_name: data.display_name };
  } catch {
    return null;
  }
}

// ── Guest / shared-link gallery sessions ─────────────────────────

export async function createGallerySession(params: {
  subjectType: "guest" | "link";
  subjectId: string;
  permissions: GalleryPermissions;
  expiresAt: Date;
  name?: string | null;
}): Promise<{ token: string; jti: string; maxAge: number }> {
  const sb = getSupabaseAdmin();
  const jti = crypto.randomUUID();
  const maxAge = Math.max(
    60,
    Math.min(Math.floor((params.expiresAt.getTime() - Date.now()) / 1000), 7 * 86400)
  );
  await sb.from("gallery_sessions").insert({
    jti,
    subject_type: params.subjectType,
    subject_id: params.subjectId,
    permissions: params.permissions,
    expires_at: params.expiresAt.toISOString(),
  });
  const token = await new SignJWT({
    role: "gallery",
    sid: jti,
    name: params.name ?? undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.subjectId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(params.expiresAt.getTime() / 1000))
    .sign(getSecret());
  return { token, jti, maxAge };
}

export async function getGallerySession(
  req: NextRequest
): Promise<GallerySession | null> {
  const raw = req.cookies.get(GALLERY_COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, getSecret());
    if (payload.role !== "gallery" || typeof payload.sid !== "string") return null;
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from("gallery_sessions")
      .select("jti, subject_type, subject_id, permissions, expires_at, revoked")
      .eq("jti", payload.sid)
      .single();
    if (!data || data.revoked) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return {
      jti: data.jti,
      subject_type: data.subject_type,
      subject_id: data.subject_id,
      permissions: data.permissions ?? { view: true, download: false },
      expires_at: data.expires_at,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
}

export async function revokeGallerySession(jti: string): Promise<void> {
  await getSupabaseAdmin()
    .from("gallery_sessions")
    .update({ revoked: true })
    .eq("jti", jti);
}

// ── CSRF: same-origin enforcement for mutating requests ──────────

export function assertSameOrigin(req: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
