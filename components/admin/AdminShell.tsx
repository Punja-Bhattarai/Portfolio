"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { api } from "@/lib/api";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/photos", label: "Photos", icon: "image" },
  { href: "/admin/albums", label: "Albums", icon: "folder" },
  { href: "/admin/projects", label: "Projects", icon: "code" },
  { href: "/admin/messages", label: "Messages", icon: "inbox" },
  { href: "/admin/access", label: "Guest Access", icon: "users" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

interface ToastItem {
  id: number;
  kind: string;
  message: string;
}

function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    let counter = 0;
    const handler = (e: Event) => {
      const { kind, message } = (e as CustomEvent<{ kind: string; message: string }>).detail;
      const id = ++counter;
      setItems((prev) => [...prev.slice(-3), { id, kind, message }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
    };
    window.addEventListener("pb-toast", handler);
    return () => window.removeEventListener("pb-toast", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className={`glass pointer-events-auto rounded-xl px-5 py-3 text-sm shadow-xl ${
              t.kind === "error"
                ? "border-red-500/40 text-red-300"
                : t.kind === "success"
                  ? "border-emerald-500/40 text-emerald-300"
                  : "text-cream"
            }`}
            role="status"
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ displayName: string; email: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api<{ authenticated: boolean; user?: { displayName: string; email: string } }>(
      "/api/auth/session"
    )
      .then((d) => {
        if (!d.authenticated || !d.user) {
          router.replace("/admin/login");
        } else {
          setUser(d.user);
        }
      })
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink lg:flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-line bg-ink2 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Admin navigation"
      >
        <div className="flex h-full flex-col p-4">
          <Link href="/" className="mb-8 flex items-center gap-3 px-2 pt-2 font-display text-sm font-bold uppercase tracking-widest2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 font-mono text-gold2">PB</span>
            <span>Studio&nbsp;<span className="gold-text">Panel</span></span>
          </Link>

          <nav className="flex-1 space-y-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setSidebarOpen(false)}
                className={`admin-sidebar-link ${pathname === n.href ? "active" : ""}`}
              >
                <Icon name={n.icon} className="h-[18px] w-[18px]" />
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-line pt-4">
            <p className="truncate px-3 text-xs text-mute">{user.email}</p>
            <div className="mt-3 space-y-1">
              <Link href="/" target="_blank" className="admin-sidebar-link !py-2 text-xs">
                <Icon name="external" className="h-4 w-4" /> View site
              </Link>
              <button onClick={logout} className="admin-sidebar-link w-full !py-2 text-xs hover:!text-red-300">
                <Icon name="logout" className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 glass lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="rounded-lg p-2 text-cream"
            >
              <Icon name="menu" className="h-6 w-6" />
            </button>
            <span className="font-display text-sm font-bold uppercase tracking-widest2">Studio Panel</span>
            <span className="w-10" />
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-5 md:p-8">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
