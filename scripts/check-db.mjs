#!/usr/bin/env node
/**
 * Diagnoses the Supabase setup: checks every table, the storage bucket,
 * and basic connectivity. Run: npm run check-db
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const f of [".env", ".env.local"]) {
  try {
    const content = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {}
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("──────────────────────────────────────");
if (!url || !key) {
  console.log("❌ .env.local is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
let parsed;
try {
  parsed = new URL(url);
  console.log(`✅ URL looks valid → ${parsed.host}`);
} catch {
  console.log(`❌ INVALID URL in .env.local: "${url}"`);
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// Connectivity + auth check
{
  const { error } = await sb.from("profiles").select("id").limit(1);
  if (error) {
    console.log("❌ Cannot reach database:", error.message);
    process.exit(1);
  }
  console.log("✅ Connected to database with service key");
}

for (const t of ["profiles", "albums", "photos", "guest_access", "gallery_links", "gallery_sessions", "contact_messages", "projects", "site_settings"]) {
  const { error } = await sb.from(t).select("*", { count: "exact", head: true });
  console.log(error ? `❌ table "${t}" — ${error.message}` : `✅ table "${t}"`);
}

// FK relationship used by /api/admin/albums
{
  const { error } = await sb.from("albums").select("*, photos!photos_album_id_fkey(count)").limit(1);
  console.log(error ? `❌ albums↔photos join — ${error.message}` : "✅ albums↔photos relationship OK");
}

// Storage bucket
{
  const { data, error } = await sb.storage.from("portfolio-media").list("", { limit: 1 });
  if (error) {
    console.log(`❌ storage bucket "portfolio-media" — ${error.message}`);
    console.log('   FIX: Supabase dashboard → Storage → New bucket → name EXACTLY "portfolio-media" → keep PRIVATE → Create');
  } else {
    console.log('✅ storage bucket "portfolio-media" accessible');
  }
}

// RPC helper function
{
  const { error } = await sb.rpc("increment_gallery_link_view", { p_id: "00000000-0000-0000-0000-000000000000" });
  // A clean "no rows affected" is fine; missing function errors out differently.
  const msg = error?.message ?? "";
  console.log(
    /function public\.increment_gallery_link_view|Could not find the function/i.test(msg)
      ? '❌ helper function increment_gallery_link_view missing'
      : "✅ helper function increment_gallery_link_view exists"
  );
}
console.log("──────────────────────────────────────");
