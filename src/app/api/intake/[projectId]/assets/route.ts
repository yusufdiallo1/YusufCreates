import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { createZip, type ZipEntry } from "@/lib/zip";

/**
 * Every asset a client uploaded, as one zip.
 *
 * The alternative is clicking eleven download links and then working out
 * which of the four files called "logo.png" is the vector one, which is
 * exactly the friction that leaves assets sitting in the portal unused.
 *
 * Admin-only, and the gate is real: `filesForDownload` calls requireAdmin on
 * the Convex side, and the auth token is forwarded explicitly below. A route
 * handler has no ambient session — without the token this is an anonymous
 * call that correctly fails, and it would fail confusingly.
 */

export const runtime = "nodejs";

/*
 * Fetching a dozen files out of storage and buffering them is not fast. The
 * default cap would abort a large intake partway and send a truncated
 * archive, which is worse than a slow one because it looks like it worked.
 */
export const maxDuration = 120;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const { projectId } = await params;

  const token = await convexAuthNextjsToken().catch(() => undefined);
  if (!token) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const data = await fetchQuery(
    api.intake.filesForDownload,
    { projectId: projectId as never },
    { token },
  ).catch(() => null);

  // Covers "not an admin", "no such project" and "no intake" alike. None of
  // them should be distinguishable from outside.
  if (!data) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (data.files.length === 0) {
    return NextResponse.json({ error: "Nothing uploaded yet." }, { status: 404 });
  }

  /*
   * Sequential fetches. These come from Convex storage over the same
   * connection, and a dozen parallel requests for multi-megabyte files is how
   * a serverless function runs out of memory holding all of them at once.
   */
  const entries: ZipEntry[] = [];
  for (const file of data.files) {
    const res = await fetch(file.url).catch(() => null);
    if (!res?.ok) continue;

    entries.push({
      // Foldered by section, so "which of these is the logo" is answered by
      // the directory rather than by opening all of them.
      name: `${file.sectionId}/${file.name}`,
      data: new Uint8Array(await res.arrayBuffer()),
      modified: new Date(file.uploadedAt),
    });
  }

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "None of the uploaded files could be read." },
      { status: 502 },
    );
  }

  const zip = createZip(entries);

  const safeProject =
    data.projectName.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "project";

  return new NextResponse(zip as unknown as BodyInit, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${safeProject} assets.zip"`,
      "content-length": String(zip.byteLength),
      // Never cached: it is behind an auth check, and a shared cache holding
      // a client's brand assets is the one thing this route must not do.
      "cache-control": "private, no-store",
    },
  });
}
