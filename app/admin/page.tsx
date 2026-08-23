import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const jar = await cookies();
  redirect(jar.get("pb_admin") ? "/admin/dashboard" : "/admin/login");
}
