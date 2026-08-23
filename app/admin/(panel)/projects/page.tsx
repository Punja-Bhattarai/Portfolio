"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { Icon } from "@/components/site/Icon";
import { api, toast } from "@/lib/api";
import { Project } from "@/lib/types";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Field, Modal } from "@/components/admin/ui";

type Tab = "project" | "lab";

const EMPTY = {
  title: "",
  description: "",
  long_description: "",
  technologies: "",
  features: "",
  github_url: "",
  demo_url: "",
  video_url: "",
  image_path: "",
  status: "completed",
  featured: false,
  sort_order: 0,
};

export default function ProjectsAdminPage() {
  const [tab, setTab] = useState<Tab>("project");
  const [items, setItems] = useState<Project[] | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api<{ projects: Project[] }>("/api/admin/projects")
      .then((d) => setItems(d.projects))
      .catch((e) => {
        toast("error", e.message);
        setItems([]);
      });
  }, []);

  useEffect(load, [load]);

  const list = (items ?? []).filter((p) => p.category === tab);

  async function remove(p: Project) {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try {
      await api(`/api/admin/projects?id=${p.id}`, { method: "DELETE" });
      toast("success", "Deleted.");
      load();
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>, existing: Project | null) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      long_description: String(fd.get("long_description") ?? ""),
      technologies: String(fd.get("technologies") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      features: String(fd.get("features") ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
      github_url: String(fd.get("github_url") ?? ""),
      demo_url: String(fd.get("demo_url") ?? ""),
      video_url: String(fd.get("video_url") ?? ""),
      image_path: String(fd.get("image_path") ?? ""),
      category: tab,
      status: String(fd.get("status") ?? "completed"),
      featured: fd.get("featured") === "on",
      sort_order: Number(fd.get("sort_order")) || 0,
    };
    try {
      await api("/api/admin/projects", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existing ? { ...body, id: existing.id } : body),
      });
      toast("success", existing ? "Saved." : "Created.");
      setEditing(null);
      setCreating(false);
      load();
    } catch (err) {
      toast("error", (err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Projects & Lab"
        subtitle="Manage what appears on the public site."
        action={
          <button onClick={() => setCreating(true)} className="btn-primary !px-5 !py-2.5 text-xs">
            <Icon name="code" className="h-4 w-4" /> New entry
          </button>
        }
      />

      {/* Tabs */}
      <div className="glass mb-6 inline-flex rounded-full p-1">
        {(["project", "lab"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
              tab === t ? "bg-gold text-black" : "text-mute hover:text-cream"
            }`}
          >
            {t === "project" ? "Projects" : "Lab experiments"}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="skeleton h-20 rounded-2xl" />))}</div>
      ) : list.length === 0 ? (
        <div className="glass rounded-3xl px-8 py-14 text-center">
          <p className="font-display text-lg font-semibold">Nothing here yet</p>
          <p className="mt-2 text-sm text-mute">
            Create entries to override the defaults on the public site.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p.id} className="card-hover glass flex flex-wrap items-center gap-4 rounded-2xl p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_path?.startsWith("/") ? p.image_path : "/images/placeholder.svg"} alt="" className="h-16 w-24 flex-none rounded-xl object-cover" aria-hidden />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display font-semibold">{p.title}</h3>
                <p className="line-clamp-1 text-sm text-mute">{p.description}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(p.technologies ?? []).slice(0, 5).map((t) => (
                    <span key={t} className="rounded border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase text-mute">{t}</span>
                  ))}
                </div>
              </div>
              <span className={`badge ${p.status === "completed" ? "badge-green" : p.status === "planned" ? "badge-gray" : "badge-gold"}`}>{p.status}</span>
              <div className="flex gap-1.5">
                <button onClick={() => setEditing(p)} aria-label={`Edit ${p.title}`} className="rounded-lg bg-white/5 p-2 hover:text-gold2"><Icon name="edit" className="h-4 w-4" /></button>
                <button onClick={() => remove(p)} aria-label={`Delete ${p.title}`} className="rounded-lg bg-white/5 p-2 hover:text-red-300"><Icon name="trash" className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && (
        <Modal onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit — ${editing.title}` : `New ${tab === "lab" ? "lab experiment" : "project"}`}>
          <form onSubmit={(e) => submit(e, editing)} className="space-y-4">
            <Field label="Title"><input name="title" required defaultValue={editing?.title} maxLength={150} className="input" /></Field>
            <Field label="Short description"><textarea name="description" defaultValue={editing?.description ?? ""} rows={2} maxLength={500} className="input resize-none" /></Field>
            <Field label="Long description (modal view)"><textarea name="long_description" defaultValue={editing?.long_description ?? ""} rows={3} maxLength={4000} className="input resize-none" /></Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Technologies (comma separated)"><input name="technologies" defaultValue={(editing?.technologies ?? []).join(", ")} className="input" placeholder="Unity, C#" /></Field>
              <Field label="Status"><input name="status" defaultValue={editing?.status ?? (tab === "lab" ? "in-progress" : "completed")} maxLength={40} className="input" /></Field>
            </div>

            <Field label="Features (one per line)"><textarea name="features" defaultValue={(editing?.features ?? []).join("\n")} rows={3} maxLength={2000} className="input resize-none" /></Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="GitHub URL"><input name="github_url" type="url" defaultValue={editing?.github_url ?? ""} className="input" placeholder="https://github.com/…" /></Field>
              <Field label="Demo URL"><input name="demo_url" type="url" defaultValue={editing?.demo_url ?? ""} className="input" /></Field>
              <Field label="Video URL"><input name="video_url" type="url" defaultValue={editing?.video_url ?? ""} className="input" /></Field>
              <Field label="Image path or URL"><input name="image_path" defaultValue={editing?.image_path ?? ""} className="input" placeholder="/images/projects/my.svg or storage path" /></Field>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-mute">
                <input type="checkbox" name="featured" defaultChecked={editing?.featured} className="accent-gold" /> Featured
              </label>
              <label className="flex items-center gap-2 text-sm text-mute">
                Sort order <input type="number" name="sort_order" min={0} max={9999} defaultValue={editing?.sort_order ?? 0} className="input !w-20 !px-2 !py-1.5" />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="btn-ghost !px-5 !py-2 text-xs">Cancel</button>
              <button type="submit" className="btn-primary !px-5 !py-2 text-xs">{editing ? "Save changes" : "Create"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
