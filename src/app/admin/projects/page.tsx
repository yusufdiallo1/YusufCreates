import type { Metadata } from "next";
import { ProjectsAdmin } from "@/components/admin/ProjectsAdmin";

export const metadata: Metadata = { title: "Projects" };

export default function AdminProjectsPage() {
  return <ProjectsAdmin />;
}
