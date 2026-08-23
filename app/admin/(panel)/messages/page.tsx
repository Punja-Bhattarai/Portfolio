"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { Icon } from "@/components/site/Icon";
import { api, toast } from "@/lib/api";
import { ContactMessage } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("unread");

  const load = useCallback(() => {
    api<{ messages: ContactMessage[] }>("/api/admin/messages")
      .then((d) => setMessages(d.messages))
      .catch((e) => {
        toast("error", e.message);
        setMessages([]);
      });
  }, []);

  useEffect(load, [load]);

  async function markRead(id: string, read: boolean) {
    await api("/api/admin/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read }),
    }).catch((e) => toast("error", e.message));
    load();
  }

  async function markAllRead() {
    await api("/api/admin/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read_all: true }),
    }).catch((e) => toast("error", e.message));
    toast("success", "All messages marked as read.");
    load();
  }

  async function remove(m: ContactMessage) {
    if (!window.confirm(`Delete message from ${m.name}?`)) return;
    await api(`/api/admin/messages?id=${m.id}`, { method: "DELETE" }).catch((e) =>
      toast("error", e.message)
    );
    load();
  }

  const list = (messages ?? []).filter((m) => (filter === "unread" ? !m.read : true));

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Contact form submissions."
        action={
          <button onClick={markAllRead} className="btn-ghost !px-5 !py-2.5 text-xs">
            <Icon name="inbox" className="h-4 w-4" /> Mark all read
          </button>
        }
      />

      <div className="glass mb-6 inline-flex rounded-full p-1">
        {(["unread", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-5 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
              filter === f ? "bg-gold text-black" : "text-mute hover:text-cream"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {messages === null ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => (<div key={i} className="skeleton h-24 rounded-2xl" />))}</div>
      ) : list.length === 0 ? (
        <div className="glass rounded-3xl px-8 py-16 text-center">
          <p className="font-display text-lg font-semibold">
            {filter === "unread" ? "Inbox zero 🎉" : "No messages yet"}
          </p>
          <p className="mt-2 text-sm text-mute">Contact form submissions will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((m) => (
            <li key={m.id} className={`glass rounded-2xl p-5 ${!m.read ? "border-l-2 border-l-gold" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold">
                    {m.name}
                    {!m.read && <span className="badge badge-gold ml-2">new</span>}
                  </p>
                  <a href={`mailto:${m.email}`} className="text-sm text-gold2 hover:underline">{m.email}</a>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-mute">
                  {new Date(m.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-mute">{m.message}</p>
              <div className="mt-4 flex gap-2">
                {!m.read && (
                  <button onClick={() => markRead(m.id, true)} className="btn-ghost !px-4 !py-1.5 !text-[11px]">Mark read</button>
                )}
                <a href={`mailto:${m.email}`} className="btn-ghost !px-4 !py-1.5 !text-[11px]">Reply</a>
                <button onClick={() => remove(m)} className="btn-ghost !px-4 !py-1.5 !text-[11px] hover:!border-red-500/50 hover:!text-red-300">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
