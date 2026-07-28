import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { CaseStudy } from "./CaseStudy";
import { SITE } from "@/lib/constants";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = isConvexConfigured
    ? await fetchQuery(api.projects.getBySlug, { slug })
    : null;

  if (!project) return { title: "Not found" };

  const url = `${SITE.url}/work/${project.slug}`;

  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: url },
    openGraph: {
      title: project.title,
      description: project.summary,
      url,
      type: "article",
      images: project.coverUrl ? [{ url: project.coverUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.summary,
      images: project.coverUrl ? [project.coverUrl] : undefined,
    },
  };
}

export default async function CaseStudyPage({ params }: Params) {
  const { slug } = await params;
  if (!isConvexConfigured) notFound();

  const token = await convexAuthNextjsToken();

  const project = await fetchQuery(api.projects.getBySlug, { slug }, { token });
  if (!project) notFound();

  // Sibling list drives the "next project" link at the foot of the page.
  const preloadedAll = await preloadQuery(
    api.projects.listPublished,
    {},
    { token },
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: project.title,
    description: project.summary,
    image: project.coverUrl ? [project.coverUrl] : undefined,
    datePublished: new Date(project._creationTime).toISOString(),
    author: { "@type": "Person", name: "Yusuf Diallo" },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE.url}/work/${project.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output is escaped by React; this is our own data.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CaseStudy project={project} preloadedAll={preloadedAll} />
    </>
  );
}
