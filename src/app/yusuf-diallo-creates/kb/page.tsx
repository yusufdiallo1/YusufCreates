import type { Metadata } from "next";
import { AiConsole } from "@/components/admin/AiConsole";

export const metadata: Metadata = { title: "AI" };

export default function AdminKbPage() {
  return <AiConsole />;
}
