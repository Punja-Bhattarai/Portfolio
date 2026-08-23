"use client";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-ink2/95 p-7">
        <h2 className="mb-5 font-display text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-mute">{label}</label>
      {children}
    </div>
  );
}
