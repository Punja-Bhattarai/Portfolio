import { NextRequest } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { jsonOk, withGuard } from "@/lib/http";

export const runtime = "nodejs";

export const GET = withGuard(async (req: NextRequest) => {
  const user = await getAdminUser(req);
  if (!user)
    return jsonOk({ authenticated: false }, { status: 200 });
  return jsonOk({
    authenticated: true,
    user: { id: user.id, email: user.email, displayName: user.display_name },
  });
});
