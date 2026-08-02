import type { Metadata } from "next";
import { ExpressAdmin } from "@/components/admin/ExpressAdmin";

export const metadata: Metadata = { title: "Express builds" };

export default function AdminExpressPage() {
  return <ExpressAdmin />;
}
