import { NextRequest } from "next/server";
import { GALLERY_COOKIE, clearSessionCookie } from "@/lib/auth";
import { jsonOk, withGuard } from "@/lib/http";

export const runtime = "nodejs";

export const POST = withGuard(async (_req: NextRequest) => {
  const res = jsonOk({ ok: true });
  clearSessionCookie(res, GALLERY_COOKIE);
  return res;
});
