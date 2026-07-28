import type { Metadata } from "next";
import { TestimonialsAdmin } from "@/components/admin/TestimonialsAdmin";

export const metadata: Metadata = { title: "Testimonials" };

export default function AdminTestimonialsPage() {
  return <TestimonialsAdmin />;
}
