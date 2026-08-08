import "server-only";
import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/lib/convex-api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Streams a stored PDF, having been told the caller may have it.
 *
 * The gate is the CALLER'S job — admin session, portal session, or a share
 * session — and this does none of it. What it does is make sure the storage
 * URL never leaves the server.
 *
 * That matters because convex/files.ts getUrl is a public query and a Convex
 * storage URL is a bearer credential that does not expire: handing one to the
 * browser would publish the signed contract permanently to anyone who ever saw
 * the link. So the bytes are fetched here and re-served under a route that can
 * be revoked.
 */
export async function servePdf(
  storageId: Id<"_storage">,
  filename: string,
  secret: string,
): Promise<Response> {
  const url = await fetchQuery(api.files.resolveForServer, {
    secret,
    storageId,
  }).catch(() => null);

  if (!url) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": "application/pdf",
      // inline, not attachment: people want to read a contract before deciding
      // whether to keep a copy, and a forced download denies them that.
      "content-disposition": `inline; filename="${filename.replace(/["\\]/g, "")}"`,
      // Never let a shared cache hold a document reachable by session.
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

/** Safe, recognisable filename for a contract PDF. */
export function contractFilename(clientName: string, signedAt?: number): string {
  const who = clientName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const when = signedAt
    ? new Date(signedAt).toISOString().slice(0, 10)
    : "unsigned";
  return `contract-${who || "client"}-${when}.pdf`;
}
