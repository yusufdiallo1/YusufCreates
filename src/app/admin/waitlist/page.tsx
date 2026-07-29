import type { Metadata } from "next";
import { WaitlistAdmin } from "@/components/admin/WaitlistAdmin";

export const metadata: Metadata = { title: "Waitlist" };

export default function AdminWaitlistPage() {
  return <WaitlistAdmin />;
}
