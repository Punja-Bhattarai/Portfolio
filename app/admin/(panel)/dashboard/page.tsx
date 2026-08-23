"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { Icon } from "@/components/site/Icon";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface StatsData {
  stats: {
    totalPhotos: number;
    publicPhotos: number;
    privatePhotos: number;
    totalAlbums: number;
    unreadMessages: number;
    guestAccessActive: number;
    sharedLinksActive: number;
  };
  recentPhotos: { id: string; title: string; visibility: string; created_at: string; thumb_url: string }[];
  recentMessages: { id: string; name: string; email: string; message: string; read: boolean; created_at: string }[];
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: string;
}) {
  return (
    <div className="card-hover glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-mute">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold">{value}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${accent ?? "bg-gold/10 text-gold2"}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<StatsData>("/api/admin/stats")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your portfolio & gallery." />

      {error && (
        <p role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Photos" value={data.stats.totalPhotos} icon="image" />
            <StatCard label="Public" value={data.stats.publicPhotos} icon="grid" accent="bg-emerald-500/15 text-emerald-300" />
            <StatCard label="Private" value={data.stats.privatePhotos} icon="lock" accent="bg-blue-500/15 text-blue-300" />
            <StatCard label="Albums" value={data.stats.totalAlbums} icon="folder" />
            <StatCard label="Unread Messages" value={data.stats.unreadMessages} icon="inbox" accent="bg-gold/10 text-gold2" />
            <StatCard label="Active Guest Access" value={data.stats.guestAccessActive} icon="users" />
            <StatCard label="Active Share Links" value={data.stats.sharedLinksActive} icon="external" accent="bg-purple-500/15 text-purple-300" />
            <StatCard label="Site" value="Online" icon="settings" accent="bg-emerald-500/15 text-emerald-300" />
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent photos */}
            <section className="glass rounded-2xl p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">Recent uploads</h2>
              {data.recentPhotos.length === 0 ? (
                <p className="text-sm text-mute">No photos uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {data.recentPhotos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.thumb_url}
                      alt={p.title}
                      title={`${p.title} (${p.visibility})`}
                      loading="lazy"
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Recent messages */}
            <section className="glass rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Recent messages</h2>
                <a href="/admin/messages" className="font-mono text-[11px] uppercase tracking-widest text-gold2 hover:underline">
                  View all
                </a>
              </div>
              {data.recentMessages.length === 0 ? (
                <p className="text-sm text-mute">No contact messages yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.recentMessages.map((m) => (
                    <li key={m.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                      <span className={`mt-1 h-2 w-2 flex-none rounded-full ${m.read ? "bg-white/20" : "bg-gold"}`} aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {m.name} <span className="text-mute">· {m.email}</span>
                        </p>
                        <p className="truncate text-xs text-mute">{m.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
