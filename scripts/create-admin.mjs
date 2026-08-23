#!/usr/bin/env node
/**
 * Creates or resets the owner/admin account.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='strong-pass' npm run create-admin
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 * (.env / .env.local supported). The password is hashed with bcrypt —
 * the plaintext is never stored anywhere.
 */
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

function loadEnvFile() {
  for (const f of [".env", ".env.local"]) {
    try {
      const content = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !(m[1] in process.env)) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* file missing – ignore */
    }
  }
}
loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";

if (!url || !key) {
  console.error("✖ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("✖ Set ADMIN_EMAIL to a valid email address.");
  process.exit(1);
}
if (password.length < 10) {
  console.error("✖ ADMIN_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const hash = await bcrypt.hash(password, 12);

// Upsert by email; reset token_version so old sessions die.
const { data: existing } = await sb
  .from("profiles")
  .select("id")
  .eq("email", email)
  .maybeSingle();

if (existing?.id) {
  const { error } = await sb
    .from("profiles")
    .update({ password_hash: hash, role: "admin" })
    .eq("id", existing.id);
  if (error) {
    console.error("✖ Update failed:", error.message);
    process.exit(1);
  }
  console.log(`✔ Admin password reset for ${email}`);
} else {
  const { error } = await sb
    .from("profiles")
    .insert({ email, password_hash: hash, display_name: "Punja Bhattarai", role: "admin" });
  if (error) {
    console.error(
      "✖ Insert failed (did you run supabase/schema.sql?):",
      error.message
    );
    process.exit(1);
  }
  console.log(`✔ Admin account created for ${email}`);
}
console.log("Done. You can now log in at /admin/login");
