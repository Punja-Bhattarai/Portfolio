import { NextRequest } from "next/server";
import { getAdminUser, getGallerySession } from "@/lib/auth";
import { jsonOk, withGuard } from "@/lib/http";

export const runtime = "nodejs";

export const GET = withGuard(async (req: NextRequest) => {
  const admin = await getAdminUser(req);
  if (admin)
    return jsonOk({
      authenticated: true,
      subject_type: "admin",
      name: admin.display_name,
      permissions: { view: true, download: true },
      expires_at: null,
    });

  const session = await getGallerySession(req);
  if (!session) return jsonOk({ authenticated: false });
  return jsonOk({
    authenticated: true,
    subject_type: session.subject_type,
    name: session.name ?? null,
    permissions: session.permissions,
    expires_at: session.expires_at,
  });
});
