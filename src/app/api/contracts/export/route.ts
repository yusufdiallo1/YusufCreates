import { NextResponse } from "next/server";
import { zipSync, strToU8 } from "fflate";
import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * The whole contract archive, as one zip.
 *
 * Contracts live in our own deployment rather than at a signing provider, and
 * that is only meaningfully different from a provider if the data can leave.
 * This is the leaving: every contract as readable markdown, its audit trail as
 * JSON, every signed PDF, and every template version — arranged so it makes
 * sense to someone who has never seen this codebase.
 *
 * fflate rather than a heavier archiver: ~8KB, pure JS, no native binding, and
 * zipSync is fine for tens of documents. Streaming would matter at a scale
 * this will not reach.
 *
 * NOT streamed and NOT paginated. An export that quietly stops at the first
 * page is worse than one that takes a few seconds, because it looks complete.
 */

export const runtime = "nodejs";

export async function GET() {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const token = await convexAuthNextjsToken();
  const allowed = await fetchQuery(api.admin.amIAdmin, {}, { token }).catch(
    () => false,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const secret = process.env.EMAIL_LOG_SECRET;
  const data = await fetchQuery(api.contracts.exportAll, {}, { token }).catch(
    () => null,
  );
  if (!data) {
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }

  const files: Record<string, Uint8Array> = {};
  const index: string[] = [
    "# Contract archive",
    "",
    `Exported ${new Date(data.exportedAt).toISOString()}`,
    "",
    "Each contract has its own folder containing:",
    "",
    "- `contract.md` — the exact text that was signed",
    "- `audit.json` — the full event chain, hashed",
    "- `signed.pdf` — the countersigned PDF, where one exists",
    "",
    "`templates/` holds every version of the source template, including",
    "versions no longer in use, so any contract can be traced to the template",
    "it came from.",
    "",
    "## Contracts",
    "",
  ];

  for (const { contract, events } of data.contracts) {
    const safeName =
      contract.clientName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      "client";
    const folder = `contracts/${safeName}-${contract._id}`;

    files[`${folder}/contract.md`] = strToU8(contract.bodySnapshot);
    files[`${folder}/audit.json`] = strToU8(
      JSON.stringify({ contract, events }, null, 2),
    );

    if (contract.signedPdfFileId && secret) {
      const pdf = await fetchPdf(contract.signedPdfFileId, secret);
      if (pdf) files[`${folder}/signed.pdf`] = pdf;
    }

    index.push(
      `- **${contract.clientName}** — ${contract.status}` +
        (contract.signedAt
          ? `, signed ${new Date(contract.signedAt).toISOString().slice(0, 10)}`
          : "") +
        ` → \`${folder}/\``,
    );
  }

  for (const template of data.templates) {
    files[`templates/v${template.version}.md`] = strToU8(template.body);
  }
  files["templates/versions.json"] = strToU8(
    JSON.stringify(data.templates, null, 2),
  );
  files["README.md"] = strToU8(index.join("\n"));

  const zipped = zipSync(files, { level: 6 });
  const stamp = new Date(data.exportedAt).toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(zipped), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="contracts-${stamp}.zip"`,
      "cache-control": "private, no-store",
    },
  });
}

async function fetchPdf(
  storageId: Id<"_storage">,
  secret: string,
): Promise<Uint8Array | null> {
  try {
    const url = await fetchQuery(api.files.resolveForServer, {
      secret,
      storageId,
    });
    if (!url) return null;
    const response = await fetch(url);
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    // A missing PDF must not sink the whole export — the markdown and the
    // audit trail are the parts that cannot be regenerated.
    return null;
  }
}
