import type { Metadata } from "next";
import { preloadQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { BlogIndex } from "./BlogIndex";
import { TextReveal } from "@/components/motion/TextReveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on building websites and web apps — costs, bilingual Arabic builds, and the tools I use.",
  alternates: { canonical: `${SITE.url}/blog` },
};

export default async function BlogPage() {
  const preloaded = isConvexConfigured
    ? await preloadQuery(api.posts.listPublished, {}).catch(() => null)
    : null;

  return (
    <div className="mx-auto max-w-3xl px-6 pt-32 pb-24">

      <TextReveal as="h1" by="word" className="block text-4xl">
        Blog
      </TextReveal>

      {/* Typed rather than faded: it is one line, and watching it written
          reads as someone talking rather than a page loading. */}
      <WordReveal as="p" className="mt-4 max-w-xl text-secondary">
        {"Notes on what things actually cost, what breaks, and why bilingual sites are harder than people expect."}
      </WordReveal>

      {preloaded ? (
        <BlogIndex preloaded={preloaded} />
      ) : (
        <p className="mt-6 text-secondary">
          Nothing published yet. Check back shortly.
        </p>
      )}
    </div>
  );
}
