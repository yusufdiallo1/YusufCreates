import type { Metadata } from "next";
import { ExpressOrder } from "@/components/marketing/ExpressOrder";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Express build — live in two hours",
  description:
    "Up to two pages, live within two hours of me starting. 40% up front; if I miss the window you keep the rest.",
  alternates: { canonical: `${SITE.url}/express` },
};

export default function ExpressPage() {
  return <ExpressOrder />;
}
