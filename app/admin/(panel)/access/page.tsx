"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { Field, Modal } from "@/components/admin/ui";
import { Icon } from "@/components/site/Icon";
import { api, toast } from "@/lib/api";
import { Album, GalleryLink, GuestAccess } from "@/lib/types";
import { FormEvent, useEffect, useState } from "react";

export default function AccessPage() {
  const [guests, setGuests] = useState<GuestAccess[] | null>(null);
  const [links, setLinks] = useState<GalleryLink[] | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [showCreateGuest, setShowCreateGuest] = useState(false);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [reveal, setReveal] = useState<{ title: string; password: string; url?: string } | null>(null);

  function load() {
    api<{ guests: GuestAccess[]; links: GalleryLink[] }>("/api/admin/access")
      .then((d) => {
        setGuests(d.guests);
        setLinks(d.links);
      })
      .catch((e) => {
        toast("error", e.message);
        setGuests([]);
        setLinks([]);
      });
    api<{ albums: Album[] }>("/api/admin/albums").then((d) => setAlbums(d.albums)).catch(() => {});
  }

  useEffect(load, []);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function createGuest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) { e.currentTarget.reportValidity(); return; }
    const fd = new FormData(e.currentTarget);
    const albumIds = albums
      .filter((a) => fd.get(`album-${a.id}`) === "on")
      .map((a) => a.id);
    try {
      const res = await api<{ generated_password: string }>("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "guest",
          name: fd.get("name"),
          album_ids: albumIds,
          download: fd.get("download") === "on",
          expires_days: fd.get("expires") ? Number(fd.get("expires")) : null,
        }),
      });
      setShowCreateGuest(false);
      load();
      setReveal({ title: String(fd.get("name")), password: res.generated_password });
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  async function createLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) { e.currentTarget.reportValidity(); return; }
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api<{ link: GalleryLink; generated_password: string | null }>("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "link",
          name: fd.get("name"),
          album_id: fd.get("album_id") || null,
          require_password: fd.get("require_password") === "on",
          download_allowed: fd.get("download_allowed") === "on",
          expires_days: fd.get("expires") ? Number(fd.get("expires")) : null,
        }),
      });
      setShowCreateLink(false);
      load();
      setReveal({
        title: `Share link /share/${res.link.slug}`,
        password: res.generated_password ?? "(no password required)",
        url: `${siteUrl}/share/${res.link.slug}`,
      });
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  async function toggleRevoked(kind: "guest" | "link", id: string, revoked: boolean) {
    await api("/api/admin/access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, action: revoked ? "restore" : "revoke" }),
    }).catch((e) => toast("error", e.message));
    toast("success", revoked ? "Access restored." : "Access revoked — active sessions killed.");
    load();
  }

  async function removeEntry(kind: "guest" | "link", id: string, name: string) {
    if (!window.confirm(`Permanently delete "${name}"?`)) return;
    await api(`/api/admin/access?kind=${kind}&id=${id}`, { method: "DELETE" }).catch((e) =>
      toast("error", e.message)
    );
    load();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => toast("success", "Copied to clipboard."));
  }

  const isExpired = (d: string | null) => d && new Date(d).getTime() < Date.now();

  return (
    <div>
      <PageHeader
        title="Guest Access"
        subtitle="Create password access for guests or shareable gallery links. Passwords are hashed — the plaintext is shown only once at creation."
        action={
          <div className="flex gap-2">
            <button onClick={() => setShowCreateGuest(true)} className="btn-primary !px-5 !py-2.5 text-xs">
              <Icon name="users" className="h-4 w-4" /> New guest
            </button>
            <button onClick={() => setShowCreateLink(true)} className="btn-ghost !px-5 !py-2.5 text-xs">
              <Icon name="external" className="h-4 w-4" /> New share link
            </button>
          </div>
        }
      />

      {/* ── Guests ─────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mb-4 font-display text-lg font-semibold">Guest accounts</h2>
        {guests === null ? (
          <div className="skeleton h-24 rounded-2xl" />
        ) : guests.length === 0 ? (
          <p className="glass rounded-2xl px-6 py-8 text-sm text-mute">No guest access created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table glass w-full min-w-[720px] rounded-2xl">
              <thead><tr><th>Name</th><th>Albums</th><th>Permissions</th><th>Expires</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {guests.map((g) => {
                  const expired = isExpired(g.expires_at);
                  return (
                    <tr key={g.id}>
                      <td className="font-medium">{g.name}</td>
                      <td className="text-mute">
                        {(g.album_ids ?? []).length === 0
                          ? "—"
                          : albums.filter((a) => g.album_ids.includes(a.id)).map((a) => a.name).join(", ") || `${g.album_ids.length} selected`}
                      </td>
                      <td>
                        <span className={`badge ${g.permissions?.download ? "badge-gold" : "badge-gray"}`}>
                          {g.permissions?.download ? "view + download" : "view only"}
                        </span>
                      </td>
                      <td className="text-mute">
                        {g.expires_at ? new Date(g.expires_at).toLocaleDateString() : "Never"}
                        {expired && <span className="badge badge-gray ml-2">expired</span>}
                      </td>
                      <td>
                        <span className={`badge ${g.revoked || expired ? "badge-gray" : "badge-green"}`}>
                          {g.revoked ? "revoked" : expired ? "inactive" : "active"}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          {!g.revoked && !expired && (
                            <button onClick={() => toggleRevoked("guest", g.id, true)} className="rounded-lg bg-white/5 p-2 text-xs hover:text-red-300" title="Revoke now">Revoke</button>
                          )}
                          {g.revoked && (
                            <button onClick={() => toggleRevoked("guest", g.id, false)} className="rounded-lg bg-white/5 p-2 text-xs hover:text-emerald-300" title="Restore">Restore</button>
                          )}
                          <button onClick={() => removeEntry("guest", g.id, g.name)} aria-label={`Delete ${g.name}`} className="rounded-lg bg-white/5 p-2 hover:text-red-300"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Shared links ───────────────────────────────────── */}
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">Shared gallery links</h2>
        {links === null ? (
          <div className="skeleton h-24 rounded-2xl" />
        ) : links.length === 0 ? (
          <p className="glass rounded-2xl px-6 py-8 text-sm text-mute">No share links yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table glass w-full min-w-[760px] rounded-2xl">
              <thead><tr><th>Slug</th><th>URL</th><th>Password</th><th>Views</th><th>Expires</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {links.map((l) => {
                  const expired = isExpired(l.expires_at);
                  return (
                    <tr key={l.id}>
                      <td className="font-medium">{l.name ?? l.slug}</td>
                      <td>
                        <button onClick={() => copy(`${siteUrl}/share/${l.slug}`)} className="font-mono text-xs text-gold2 hover:underline" title="Copy link">
                          /share/{l.slug} ⧉
                        </button>
                      </td>
                      <td>{l.require_password ? <span className="badge badge-gold">required</span> : <span className="badge badge-gray">open</span>}</td>
                      <td className="text-mute">{l.view_count}</td>
                      <td className="text-mute">{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : "Never"}{expired && <span className="badge badge-gray ml-2">expired</span>}</td>
                      <td><span className={`badge ${l.revoked || expired ? "badge-gray" : "badge-green"}`}>{l.revoked ? "revoked" : expired ? "inactive" : "active"}</span></td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          {!l.revoked && !expired && (
                            <button onClick={() => toggleRevoked("link", l.id, true)} className="rounded-lg bg-white/5 p-2 text-xs hover:text-red-300">Revoke</button>
                          )}
                          {l.revoked && (
                            <button onClick={() => toggleRevoked("link", l.id, false)} className="rounded-lg bg-white/5 p-2 text-xs hover:text-emerald-300">Restore</button>
                          )}
                          <button onClick={() => removeEntry("link", l.id, l.name ?? l.slug)} aria-label="Delete link" className="rounded-lg bg-white/5 p-2 hover:text-red-300"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create guest modal */}
      {showCreateGuest && (
        <Modal onClose={() => setShowCreateGuest(false)} title="New guest access">
          <form onSubmit={createGuest} className="space-y-4">
            <Field label="Access name (shown to guest)"><input name="name" required maxLength={100} className="input" placeholder="e.g. College Memories" /></Field>
            <Field label="Albums they can view">
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-line p-3">
                {albums.length === 0 ? <p className="text-sm text-mute">No albums yet — create one first.</p> : albums.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm text-mute">
                    <input type="checkbox" name={`album-${a.id}`} defaultChecked={a.visibility === "guest"} className="accent-gold" />
                    {a.name}
                  </label>
                ))}
              </div>
            </Field>
            <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" name="download" className="accent-gold" /> Allow downloads</label>
            <Field label="Expires after (days — empty = never)"><input type="number" name="expires" min={1} max={365} className="input" placeholder="30" /></Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreateGuest(false)} className="btn-ghost !px-5 !py-2 text-xs">Cancel</button>
              <button type="submit" className="btn-primary !px-5 !py-2 text-xs">Generate password</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create link modal */}
      {showCreateLink && (
        <Modal onClose={() => setShowCreateLink(false)} title="New shared gallery link">
          <form onSubmit={createLink} className="space-y-4">
            <Field label="Name (used to build the URL)"><input name="name" required maxLength={100} className="input" placeholder="e.g. college-2026" /></Field>
            <Field label="Album to share">
              <select name="album_id" className="input">
                <option value="">All my guest albums</option>
                {albums.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" name="require_password" defaultChecked className="accent-gold" /> Require password</label>
            <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" name="download_allowed" className="accent-gold" /> Allow downloads</label>
            <Field label="Expires after (days — empty = never)"><input type="number" name="expires" min={1} max={365} className="input" placeholder="14" /></Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreateLink(false)} className="btn-ghost !px-5 !py-2 text-xs">Cancel</button>
              <button type="submit" className="btn-primary !px-5 !py-2 text-xs">Create link</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Password reveal modal */}
      {reveal && (
        <Modal onClose={() => setReveal(null)} title="Access created ✓">
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-mute">
              Share these credentials with your guest. <strong className="text-red-300">This is shown only once</strong> —
              only a secure hash is stored on the server.
            </p>
            <div className="glass rounded-xl p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-mute">For</p>
              <p className="mt-1 font-medium">{reveal.title}</p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-mute">Password</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-black/40 px-3 py-2 font-mono text-sm text-gold2 select-all">{reveal.password}</code>
                <button onClick={() => copy(reveal.password)} className="btn-ghost !px-3 !py-1.5 !text-[11px]" aria-label="Copy password">Copy</button>
              </div>
              {reveal.url && (
                <>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-mute">Link</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 break-all rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-cream select-all">{reveal.url}</code>
                    <button onClick={() => copy(reveal.url!)} className="btn-ghost !px-3 !py-1.5 !text-[11px]" aria-label="Copy link">Copy</button>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setReveal(null)} className="btn-primary w-full justify-center !py-2.5 text-xs">I&apos;ve saved it</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
