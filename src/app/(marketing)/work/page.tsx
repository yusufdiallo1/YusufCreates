import { preloadQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { WorkIndex } from "./WorkIndex";

export const metadata = {
  title: "Work",
  description: "Selected projects and case studies.",
};

export default async function WorkPage() {
  // Degrades to the empty state if Convex is unreachable or not yet deployed.
  const preloaded = isConvexConfigured
    ? await preloadQuery(
        api.projects.listPublished,
        {},
        { token: await convexAuthNextjsToken() },
      ).catch(() => null)
    : null;

  if (!preloaded) {
    return (
      <div className="mx-auto max-w-5xl px-6 pt-32 pb-24">
        <h1 className="text-4xl">Work</h1>
        <p className="mt-6 text-secondary">
          Case studies are being written up. Check back shortly.
        </p>
      </div>
    );
  }

  return <WorkIndex preloaded={preloaded} />;
}
