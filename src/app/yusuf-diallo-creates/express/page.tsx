import type { Metadata } from "next";
import { ExpressAdmin } from "@/components/admin/ExpressAdmin";

export const metadata: Metadata = { title: "Express" };

export default function AdminExpressPage() {
  return <ExpressAdmin />;
}
