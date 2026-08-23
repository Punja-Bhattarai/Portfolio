import type { Metadata } from "next";
import { PrivateGallery } from "@/components/site/PrivateGallery";

export const metadata: Metadata = {
  title: "Private Gallery",
  description: "Password protected photo gallery.",
  robots: { index: false, follow: false },
};

export default function PrivateGalleryPage() {
  return <PrivateGallery />;
}
