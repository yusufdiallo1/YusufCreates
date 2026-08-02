import type { Metadata } from "next";
import { ContentAdmin } from "@/components/admin/ContentAdmin";

export const metadata: Metadata = { title: "Content" };

export default function AdminContentPage() {
  return <ContentAdmin />;
}
