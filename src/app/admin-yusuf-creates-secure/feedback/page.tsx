import type { Metadata } from "next";
import { FeedbackAdmin } from "@/components/admin/FeedbackAdmin";

export const metadata: Metadata = { title: "Feedback" };

export default function AdminFeedbackPage() {
  return <FeedbackAdmin />;
}
