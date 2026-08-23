import type { Metadata } from "next";
import { PrivateGallery } from "@/components/site/PrivateGallery";

export const metadata: Metadata = {
  title: "Shared Gallery",
  description: "Shared photo gallery.",
  robots: { index: false, follow: false },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PrivateGallery initialLink={slug} />;
}
