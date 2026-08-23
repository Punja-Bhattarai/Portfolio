"use client";

import { FormEvent, useState } from "react";
import { PROFILE } from "@/data/content";
import { Icon } from "./Icon";
import { Reveal, SectionHeading } from "./Reveal";

type Status = "idle" | "sending" | "sent" | "error" | "rate_limited" | "unconfigured";

export function Contact({ email }: { email?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          message: fd.get("message"),
          website: fd.get("website"), // honeypot
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("sent");
        form.reset();
      } else {
        setStatus(res.status === 503 ? "unconfigured" : res.status === 429 ? "rate_limited" : "error");
        setErrorMsg(data.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error — please try again.");
    }
  }

  const contactEmail = email || PROFILE.email;

  return (
    <section id="contact" className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
      <SectionHeading index="06" label="Contact" title="Let's build something" />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <Reveal>
            <p className="text-lg leading-relaxed text-mute">
              Have a project idea, a collaboration proposal, or just want to say hi? My inbox
              is always open.
            </p>
          </Reveal>

          {contactEmail ? (
            <Reveal delay={0.1}>
              <a
                href={`mailto:${contactEmail}`}
                className="card-hover glass mt-8 inline-flex items-center gap-3 rounded-2xl px-6 py-4"
              >
                <Icon name="mail" className="h-5 w-5 text-gold2" />
                <span>{contactEmail}</span>
              </a>
            </Reveal>
          ) : null}

          <Reveal delay={0.15}>
            <p className="mt-10 font-mono text-[11px] uppercase tracking-widest2 text-mute/70">
              Typical response time — within 48 hours
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          {status === "sent" ? (
            <div className="glass rounded-3xl p-10 text-center" role="status">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                ✓
              </div>
              <h3 className="font-display text-xl font-semibold">Message sent</h3>
              <p className="mt-2 text-sm text-mute">
                Thanks for reaching out — I&apos;ll get back to you soon.
              </p>
              <button onClick={() => setStatus("idle")} className="btn-ghost mt-6 !px-5 !py-2 text-xs">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="glass space-y-5 rounded-3xl p-7 sm:p-9" noValidate={false}>
              {/* Honeypot – hidden from real users */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

              <div>
                <label htmlFor="c-name" className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">
                  Name
                </label>
                <input id="c-name" name="name" required minLength={2} maxLength={100} className="input" placeholder="Your name" />
              </div>
              <div>
                <label htmlFor="c-email" className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">
                  Email
                </label>
                <input id="c-email" name="email" type="email" required maxLength={254} className="input" placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="c-message" className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">
                  Message
                </label>
                <textarea
                  id="c-message"
                  name="message"
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={5}
                  className="input resize-none"
                  placeholder="Tell me about your idea…"
                />
              </div>

              {["error", "rate_limited", "unconfigured"].includes(status) && (
                <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {status === "unconfigured"
                    ? "Messaging isn't configured yet — please connect Supabase (see README)."
                    : status === "rate_limited"
                      ? errorMsg || "You're sending messages too quickly."
                      : errorMsg}
                </p>
              )}

              <button type="submit" disabled={status === "sending"} className="btn-primary w-full justify-center disabled:opacity-60 sm:w-auto">
                {status === "sending" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" aria-hidden />
                    Sending…
                  </>
                ) : (
                  <>
                    Send Message
                    <Icon name="chevronRight" className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
