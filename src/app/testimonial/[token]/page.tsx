import type { Metadata } from "next";
import { MinimalNav } from "@/components/ui/MinimalNav";
import { TestimonialForm } from "./TestimonialForm";

/**
 * noindex: the token is the only credential, and a testimonial invitation has
 * no business appearing in a search result.
 */
export const metadata: Metadata = {
  title: "Leave a testimonial",
  robots: { index: false, follow: false },
};

export default async function TestimonialPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="flex min-h-full flex-col">
      <MinimalNav />
      <main id="main" className="flex-1">
        <TestimonialForm token={token} />
      </main>
    </div>
  );
}
