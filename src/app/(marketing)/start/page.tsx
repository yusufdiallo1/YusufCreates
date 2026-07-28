import type { Metadata } from "next";
import { StartForm } from "./StartForm";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Start a project",
  description: "Tell me about your project. Three short steps.",
  alternates: { canonical: `${SITE.url}/start` },
};

export default function StartPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 pt-32 pb-24">
      <StartForm />
    </div>
  );
}
