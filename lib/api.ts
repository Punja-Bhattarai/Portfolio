"use client";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** JSON fetch helper that throws ApiError with friendly messages. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(0, "network", "Network error — check your connection.");
  }

  if (res.status === 401 && !url.includes("/api/auth/")) {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      window.location.href = "/admin/login?expired=1";
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.error ?? "error",
      data.message ?? "Something went wrong. Please try again."
    );
  }
  return data as T;
}

/** Multipart upload with progress via XHR. */
export function apiUpload<T>(
  url: string,
  form: FormData,
  onProgress?: (pct: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiError(xhr.status, String(data.error ?? "error"), String(data.message ?? "Upload failed.")));
    };
    xhr.onerror = () => reject(new ApiError(0, "network", "Upload failed — network error."));
    xhr.send(form);
  });
}

export function toast(kind: "success" | "error" | "info", message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("pb-toast", { detail: { kind, message } }));
}
