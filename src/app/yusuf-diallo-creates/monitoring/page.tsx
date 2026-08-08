import type { Metadata } from "next";
import { MonitoringAdmin } from "@/components/admin/MonitoringAdmin";

export const metadata: Metadata = { title: "Monitoring" };

export default function AdminMonitoringPage() {
  return <MonitoringAdmin />;
}
