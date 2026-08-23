"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, FormEvent, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { ApiError } from "@/lib/api";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];


function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get("expired");
  const [error, setError] = useState(expired ? "Session expired — please sign in again." : "");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 503) {
          setError("Backend isn't configured yet. Set up Supabase and create an admin account first.");
        } else {
          setError(data.message ?? "Invalid email or password.");
        }
        return;
      }
      router.replace("/admin/dashboard");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grain flex min-h-screen items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="glass w-full max-w-md rounded-3xl p-8 sm:p-10"
      >
        <a href="/" className="mb-8 flex items-center gap-3 font-display text-sm font-bold uppercase tracking-widest2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 font-mono text-gold2">PB</span>
          Studio&nbsp;<span className="gold-text">Panel</span>
        </a>

        <h1 className="font-display text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-mute">Owner access only.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="a-email" className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">
              Email
            </label>
            <input id="a-email" name="email" type="email" required autoComplete="email" className="input" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="a-pass" className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">
              Password
            </label>
            <input id="a-pass" name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••••" />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" aria-hidden />
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <Icon name="chevronRight" className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-mute/60">
          Create the owner account with <span className="text-gold2">npm run create-admin</span>
        </p>
      </motion.div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" aria-label="Loading" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
