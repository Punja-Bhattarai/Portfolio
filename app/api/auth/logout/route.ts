import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, clearSessionCookie } from "@/lib/auth";
import { withGuard } from "@/lib/http";

export const runtime = "nodejs";

export const POST = withGuard(async (_req: NextRequest) => {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res, ADMIN_COOKIE);
  return res;
});
