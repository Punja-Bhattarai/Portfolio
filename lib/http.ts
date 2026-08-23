import { NextResponse } from "next/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data as object, { status: 200, ...init });
}

export function jsonError(
  status: number,
  code: string,
  message: string
): NextResponse {
  return NextResponse.json({ error: code, message }, { status });
}

/**
 * Wraps a route handler so unexpected errors never leak internals
 * (no stack traces or DB messages reach the client).
 */
export function withGuard(handler: (req: any) => Promise<Response>) {
  return async (req: any): Promise<Response> => {
    try {
      return await handler(req);
    } catch (err) {
      console.error("[api]", err);
      return jsonError(500, "server_error", "Something went wrong. Please try again.");
    }
  };
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return null;
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
