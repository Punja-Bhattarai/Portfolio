"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { Field, Modal } from "@/components/admin/ui";
import { Icon } from "@/components/site/Icon";
import { api, apiUpload, toast } from "@/lib/api";
import { SocialLink } from "@/lib/types";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

interface SettingsData {
  settings: {
    profile?: Record<string, unknown>;
    socials?: SocialLink[];
    hero?: Record<string, unknown>;
  };
  avatar_url: string | null;
  cv_url: string | null;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cvName, setCvName] = useState("");
  const [pwModal, setPwModal] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const cvInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<SettingsData>("/api/admin/settings")
      .then((d) => {
        setData(d);
        setAvatarUrl(d.avatar_url);
      })
      .catch((e) => toast("error", e.message));
  }, []);

  async function saveSection(section: "profile" | "socials" | "hero", form: HTMLFormElement) {
    const fd = new FormData(form);
    let payload: Record<string, unknown>;
    if (section === "socials") {
      payload = {
        socials: ["GitHub", "LinkedIn", "Email", "Instagram"].map((label) => ({
          label,
          url: String(fd.get(label.toLowerCase()) ?? ""),
        })).filter((s) => s.url),
      };
    } else if (section === "hero") {
      payload = { hero: {} };
    } else {
      payload = {
        profile: {
          ...(data?.settings.profile ?? {}),
          name: fd.get("name"),
          roles: String(fd.get("roles") ?? "").split("•").map((r) => r.trim()).filter(Boolean),
          intro: fd.get("intro"),
          aboutBio1: fd.get("bio1"),
          aboutBio2: fd.get("bio2"),
          email: fd.get("email"),
          location: fd.get("location"),
          philosophy: fd.get("philosophy"),
          cvFile: String(fd.get("cv_url") ?? "/cv/CV.pdf").trim(),
        },
      };
    }
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: payload }),
      });
      toast("success", "Settings saved.");
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  async function uploadAsset(kind: "avatar" | "cv", e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    try {
      toast("info", `Uploading ${kind}…`);
      const res = await apiUpload<{ url: string }>("/api/admin/settings", form);
      if (kind === "avatar") setAvatarUrl(res.url);
      else setCvName(file.name);
      toast("success", `${kind === "avatar" ? "Profile image" : "CV"} updated.`);
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: fd.get("current"),
          new_password: fd.get("next"),
        }),
      });
      toast("success", "Password changed. Other sessions were signed out.");
      setPwModal(false);
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Settings" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  const profile = data.settings.profile ?? {};

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        subtitle="Profile, assets and account security."
        action={
          <button onClick={() => setPwModal(true)} className="btn-ghost !px-5 !py-2.5 text-xs">
            <Icon name="lock" className="h-4 w-4" /> Change password
          </button>
        }
      />

      {/* Profile */}
      <form
        onSubmit={(e) => { e.preventDefault(); saveSection("profile", e.currentTarget); }}
        className="glass space-y-5 rounded-2xl p-6"
      >
        <h2 className="font-display text-lg font-semibold">Profile</h2>

        <div className="flex flex-wrap items-center gap-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Profile image" className="h-20 w-20 rounded-full object-cover ring-2 ring-gold/40" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/10 font-mono text-xl text-gold2">PB</span>
          )}
          <div>
            <button type="button" onClick={() => avatarInput.current?.click()} className="btn-ghost !px-4 !py-2 text-xs">
              Upload profile image
            </button>
            <input ref={avatarInput} type="file" accept=".jpg,.jpeg,.png,.webp" hidden onChange={(e) => uploadAsset("avatar", e)} />
            <p className="mt-1.5 text-xs text-mute">JPG/PNG/WEBP · max 2 MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Display name"><input name="name" defaultValue={String(profile.name ?? "")} maxLength={100} className="input" /></Field>
          <Field label="Location"><input name="location" defaultValue={String(profile.location ?? "")} maxLength={100} className="input" /></Field>
          <Field label="Contact email (shown publicly)"><input name="email" type="email" defaultValue={String(profile.email ?? "")} maxLength={254} className="input" /></Field>
          <Field label="Roles (separate with •)"><input name="roles" defaultValue={Array.isArray(profile.roles) ? (profile.roles as string[]).join(" • ") : ""} className="input" /></Field>
        </div>
        <Field label="Hero introduction"><textarea name="intro" defaultValue={String(profile.intro ?? "")} rows={3} maxLength={600} className="input resize-none" /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="About bio — paragraph 1"><textarea name="bio1" defaultValue={typeof profile.aboutBio1 === "string" ? profile.aboutBio1 : Array.isArray(profile.aboutBio) ? String((profile.aboutBio as string[])[0] ?? "") : ""} rows={3} className="input resize-none" /></Field>
          <Field label="About bio — paragraph 2"><textarea name="bio2" defaultValue={typeof profile.aboutBio2 === "string" ? profile.aboutBio2 : Array.isArray(profile.aboutBio) ? String((profile.aboutBio as string[])[1] ?? "") : ""} rows={3} className="input resize-none" /></Field>
        </div>
        <Field label="Development philosophy (quote)"><textarea name="philosophy" defaultValue={String(profile.philosophy ?? "")} rows={2} maxLength={400} className="input resize-none" /></Field>
        <Field label="CV download link (used when no PDF uploaded)"><input name="cv_url" defaultValue={String(profile.cvFile ?? "/cv/CV.pdf")} className="input" /></Field>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary !px-6 !py-2.5 text-xs">Save profile</button>
        </div>
      </form>

      {/* CV upload */}
      <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">CV file</h2>
          <p className="mt-1 text-sm text-mute">
            {cvName ? cvName : data.cv_url ? "A CV PDF is stored." : "No PDF uploaded yet — Download CV uses the link above."}
          </p>
        </div>
        <div>
          <button type="button" onClick={() => cvInput.current?.click()} className="btn-primary !px-5 !py-2.5 text-xs">Upload CV (PDF)</button>
          <input ref={cvInput} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => uploadAsset("cv", e)} />
        </div>
      </div>

      {/* Socials */}
      <form
        onSubmit={(e) => { e.preventDefault(); saveSection("socials", e.currentTarget); }}
        className="glass space-y-4 rounded-2xl p-6"
      >
        <h2 className="font-display text-lg font-semibold">Social links</h2>
        <p className="-mt-2 text-sm text-mute">Leave a field empty to hide it from the footer.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {["GitHub", "LinkedIn", "Email", "Instagram"].map((label) => {
            const existing = (data.settings.socials ?? []).find((s) => s.label.toLowerCase() === label.toLowerCase());
            return (
              <Field key={label} label={label}>
                <input
                  name={label.toLowerCase()}
                  type={label === "Email" ? "text" : "url"}
                  defaultValue={existing?.url ?? ""}
                  placeholder={label === "Email" ? "mailto:you@example.com" : "https://…"}
                  className="input"
                />
              </Field>
            );
          })}
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary !px-6 !py-2.5 text-xs">Save links</button>
        </div>
      </form>

      {/* Password modal */}
      {pwModal && (
        <Modal onClose={() => setPwModal(false)} title="Change password">
          <form onSubmit={changePassword} className="space-y-4">
            <Field label="Current password"><input type="password" name="current" required autoComplete="current-password" className="input" /></Field>
            <Field label="New password (min 10 chars)"><input type="password" name="next" required minLength={10} autoComplete="new-password" className="input" /></Field>
            <p className="rounded-lg border border-line px-4 py-3 text-xs leading-relaxed text-mute">
              Changing your password immediately signs out every other device.
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setPwModal(false)} className="btn-ghost !px-5 !py-2 text-xs">Cancel</button>
              <button type="submit" className="btn-primary !px-5 !py-2 text-xs">Update password</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
