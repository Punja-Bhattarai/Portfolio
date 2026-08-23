"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { Icon } from "@/components/site/Icon";
import { api, toast } from "@/lib/api";
import { Album } from "@/lib/types";
import { Modal, Field } from "@/components/admin/ui";
import { FormEvent, useCallback, useEffect, useState } from "react";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);

  const load = useCallback(() => {
    api<{ albums: Album[] }>("/api/admin/albums")
      .then((d) => setAlbums(d.albums))
      .catch((e) => {
        toast("error", e.message);
        setAlbums([]);
      });
  }, []);

  useEffect(load, [load]);

  async function createAlbum(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/admin/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          description: fd.get("description") || "",
          visibility: fd.get("visibility"),
        }),
      });
      toast("success", "Album created.");
      setCreating(false);
      load();
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/admin/albums", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          name: String(fd.get("name")),
          description: String(fd.get("description") || ""),
          visibility: fd.get("visibility"),
        }),
      });
      toast("success", "Album updated.");
      setEditing(null);
      load();
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  async function deleteAlbum(album: Album) {
    if (!window.confirm(`Delete album "${album.name}"? Photos inside will be kept but unassigned.`)) return;
    try {
      await api(`/api/admin/albums?id=${album.id}`, { method: "DELETE" });
      toast("success", "Album deleted.");
      load();
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Albums"
        subtitle="Organise photos into albums for guests and the public gallery."
        action={
          <button onClick={() => setCreating(true)} className="btn-primary !px-5 !py-2.5 text-xs">
            <Icon name="folder" className="h-4 w-4" /> New album
          </button>
        }
      />

      {albums === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="glass rounded-3xl px-8 py-16 text-center">
          <p className="font-display text-lg font-semibold">No albums yet</p>
          <p className="mt-2 text-sm text-mute">Create your first album to start organising photos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a) => (
            <article key={a.id} className="card-hover glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-semibold">{a.name}</h3>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-mute">/{a.slug}</p>
                </div>
                <span className={`badge ${a.visibility === "public" ? "badge-green" : "badge-gold"}`}>{a.visibility}</span>
              </div>

              {a.description && <p className="mt-3 line-clamp-2 text-sm text-mute">{a.description}</p>}

              <div className="mt-5 flex items-center justify-between">
                <span className="font-mono text-xs text-mute">{a.photo_count ?? 0} photo{(a.photo_count ?? 0) === 1 ? "" : "s"}</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setEditing(a)} aria-label={`Rename ${a.name}`} className="rounded-lg bg-white/5 p-2 hover:text-gold2">
                    <Icon name="edit" className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteAlbum(a)} aria-label={`Delete ${a.name}`} className="rounded-lg bg-white/5 p-2 hover:text-red-300">
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <Modal onClose={() => setCreating(false)} title="Create album">
          <form onSubmit={createAlbum} id="album-create" className="space-y-4">
            <Field label="Name"><input name="name" required maxLength={120} className="input" placeholder="e.g. College Memories" /></Field>
            <Field label="Description"><textarea name="description" maxLength={600} rows={3} className="input resize-none" /></Field>
            <Field label="Visibility">
              <select name="visibility" className="input">
                <option value="guest">Guest (private — access via password/link)</option>
                <option value="public">Public (shown on portfolio gallery)</option>
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreating(false)} className="btn-ghost !px-5 !py-2 text-xs">Cancel</button>
              <button type="submit" className="btn-primary !px-5 !py-2 text-xs">Create album</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal onClose={() => setEditing(null)} title="Rename / edit album">
          <form onSubmit={saveEdit} className="space-y-4">
            <Field label="Name"><input name="name" required defaultValue={editing.name} maxLength={120} className="input" /></Field>
            <Field label="Description"><textarea name="description" defaultValue={editing.description ?? ""} maxLength={600} rows={3} className="input resize-none" /></Field>
            <Field label="Visibility">
              <select name="visibility" defaultValue={editing.visibility} className="input">
                <option value="guest">Guest (private)</option>
                <option value="public">Public</option>
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost !px-5 !py-2 text-xs">Cancel</button>
              <button type="submit" className="btn-primary !px-5 !py-2 text-xs">Save changes</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
