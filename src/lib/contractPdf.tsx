import "server-only";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/lib/convex-api";
import type { Doc, Id } from "@convex/_generated/dataModel";

/**
 * The signed contract as a PDF, with a certificate page.
 *
 * @react-pdf/renderer rather than pdf-lib because a contract is multi-page
 * prose: it needs text wrapping and automatic page breaks, and pdf-lib has
 * neither — with it you compute line breaks and pagination by hand, which is
 * the entire job. Headless Chrome was the other candidate and is worse here:
 * playwright is a devDependency, so production would need a bundled chromium
 * at roughly 50MB against Vercel's function size limit, for one document.
 *
 * Server-only, invoked from a Node route, so none of this reaches the client
 * bundle.
 *
 * THE CERTIFICATE PAGE IS THE POINT. A PDF of the contract text is just a
 * printout; what makes this worth storing is the second page — the hash of the
 * exact bytes signed, the chain root, and every event with its timestamp and
 * address. That is the "retained, reproducible record" limb of ESIGN, and it
 * is what someone would actually be shown.
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontSize: 10.5,
    lineHeight: 1.55,
    fontFamily: "Helvetica",
    color: "#111111",
  },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 14 },
  h2: { fontSize: 12.5, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 6 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4 },
  p: { marginBottom: 8 },
  li: { marginBottom: 4, paddingLeft: 12 },
  rule: { borderBottomWidth: 1, borderBottomColor: "#dddddd", marginVertical: 12 },
  small: { fontSize: 8.5, color: "#555555" },
  mono: { fontFamily: "Courier", fontSize: 8 },
  label: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  row: { flexDirection: "row", marginBottom: 5 },
  rowLabel: { width: 110, fontFamily: "Helvetica-Bold", fontSize: 9 },
  rowValue: { flex: 1, fontSize: 9 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    fontSize: 7.5,
    color: "#888888",
  },
  signatureBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#dddddd",
    padding: 8,
    width: 260,
  },
  signatureImage: { width: 240, height: 72, objectFit: "contain" },
});

/**
 * Renders the same markdown subset src/lib/markdown.tsx supports, into PDF
 * primitives.
 *
 * A second renderer, which this repo has been burned by before — there were
 * once two copies of the markdown parser and they drifted. This one is
 * unavoidable: React DOM elements cannot be drawn into a PDF. The mitigation
 * is that the SUBSET is the same and deliberately tiny, and the contract
 * template is written to stay inside it.
 */
function markdownToPdf(source: string): React.ReactElement[] {
  const out: React.ReactElement[] = [];

  source.split(/\n{2,}/).forEach((block, i) => {
    const text = block.trim();
    if (!text) return;
    const key = `b${i}`;

    if (text === "---" || text === "***") {
      out.push(<View key={key} style={styles.rule} />);
      return;
    }
    if (text.startsWith("### ")) {
      out.push(<Text key={key} style={styles.h3}>{strip(text.slice(4))}</Text>);
      return;
    }
    if (text.startsWith("## ")) {
      out.push(<Text key={key} style={styles.h2}>{strip(text.slice(3))}</Text>);
      return;
    }
    if (text.startsWith("# ")) {
      out.push(<Text key={key} style={styles.h1}>{strip(text.slice(2))}</Text>);
      return;
    }
    if (text.startsWith("> ")) {
      out.push(
        <Text key={key} style={[styles.p, { paddingLeft: 12, color: "#444444" }]}>
          {strip(text.replace(/^>\s?/gm, ""))}
        </Text>,
      );
      return;
    }
    if (/^[-*]\s/.test(text)) {
      text.split("\n").forEach((line, j) => {
        out.push(
          <Text key={`${key}-${j}`} style={styles.li}>
            •  {strip(line.replace(/^[-*]\s*/, ""))}
          </Text>,
        );
      });
      return;
    }
    if (/^\d+\.\s/.test(text)) {
      text.split("\n").forEach((line, j) => {
        const match = line.match(/^(\d+)\.\s*(.*)$/);
        out.push(
          <Text key={`${key}-${j}`} style={styles.li}>
            {match ? `${match[1]}.  ${strip(match[2])}` : strip(line)}
          </Text>,
        );
      });
      return;
    }

    out.push(
      <Text key={key} style={styles.p}>
        {strip(text.replace(/\n/g, " "))}
      </Text>,
    );
  });

  return out;
}

/**
 * Flattens inline markers to plain text.
 *
 * Bold and italic inside a paragraph would need the text split into nested
 * <Text> runs. In a contract that buys emphasis and risks a layout bug in the
 * one document that must not have one, so the markers are simply removed and
 * the words kept. Nothing is lost that changes meaning.
 */
function strip(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
}

function when(ts: number | undefined): string {
  if (!ts) return "—";
  // UTC, explicitly. A timestamp on an audit record that silently renders in
  // whatever timezone the server happens to be in is not evidence of anything.
  return `${new Date(ts).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

function ContractDocument({
  contract,
  events,
  signatureSrc,
}: {
  contract: Doc<"contracts">;
  events: Doc<"contractEvents">[];
  signatureSrc?: string;
}) {
  return (
    <Document
      title={`Contract — ${contract.clientName}`}
      author="YusufCreates"
      subject={`Signed ${when(contract.signedAt)}`}
    >
      <Page size="A4" style={styles.page}>
        {markdownToPdf(contract.bodySnapshot)}

        <View style={styles.rule} />
        <Text style={styles.h2}>Signature</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Signed by</Text>
          <Text style={styles.rowValue}>{contract.signerTypedName ?? "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Date</Text>
          <Text style={styles.rowValue}>{when(contract.signedAt)}</Text>
        </View>
        {signatureSrc ? (
          <View style={styles.signatureBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image takes no alt */}
            <Image src={signatureSrc} style={styles.signatureImage} />
          </View>
        ) : null}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${contract.clientName} — page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Signature record</Text>
        <Text style={[styles.p, styles.small]}>
          This page is the evidence for the signature on the agreement above.
          The fingerprint below is a SHA-256 hash of the exact text that was
          signed; if a single character of that text changes, the fingerprint
          changes with it. Each event is hashed together with the hash of the
          event before it, so removing or altering any one of them invalidates
          every event that follows.
        </Text>

        <Text style={styles.h2}>The agreement</Text>
        <Detail label="Contract" value={contract._id} mono />
        <Detail label="Proposal" value={contract.proposalId} mono />
        <Detail label="Template" value={`version ${contract.templateVersion}`} />
        <Detail label="Text fingerprint" value={contract.bodyHash ?? "—"} mono />
        <Detail label="Chain root" value={contract.auditRoot ?? "—"} mono />

        <Text style={styles.h2}>The signer</Text>
        <Detail label="Name typed" value={contract.signerTypedName ?? "—"} />
        <Detail label="Email" value={contract.clientEmail} />
        <Detail label="Signed at" value={when(contract.signedAt)} />
        <Detail label="Network address" value={contract.signerIp ?? "—"} mono />
        <Detail label="Browser" value={contract.signerUserAgent ?? "—"} />

        <Text style={styles.h2}>Consent given</Text>
        <Text style={[styles.p, styles.small]}>
          {contract.consentText ?? "—"}
        </Text>
        <Detail label="Consented at" value={when(contract.consentAcceptedAt)} />

        <Text style={styles.h2}>Event log</Text>
        {events.map((event) => (
          <View key={event._id} style={{ marginBottom: 7 }}>
            <Text style={styles.label}>
              {event.seq}. {event.type} — {when(event.at)}
            </Text>
            {event.ip ? (
              <Text style={styles.small}>from {event.ip}</Text>
            ) : null}
            <Text style={styles.mono}>{event.hash}</Text>
          </View>
        ))}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Signature record — page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, ...(mono ? [styles.mono] : [])]}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Bounded, and retried without the image if the image is what broke it.
 *
 * A malformed signature PNG once took this renderer 4.9 minutes. The bytes are
 * now validated before they are ever stored (src/lib/pngGuard.ts), so that
 * exact case cannot recur — but this sits inside a request that is trying to
 * redirect somebody to a payment page, and "the renderer cannot hang" should
 * not depend on having thought of every bad input in advance.
 *
 * So: a hard ceiling, and one retry with the image dropped. A contract PDF
 * without the drawn squiggle is still the whole agreement plus the full
 * signature record; a request that never returns is not.
 */
const RENDER_TIMEOUT_MS = 20_000;

function withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} exceeded ${RENDER_TIMEOUT_MS}ms`)),
        RENDER_TIMEOUT_MS,
      ),
    ),
  ]);
}

export async function renderContractPdf(
  contract: Doc<"contracts">,
  events: Doc<"contractEvents">[],
  signatureSrc?: string,
): Promise<Buffer> {
  const ordered = [...events].sort((a, b) => a.seq - b.seq);

  const render = (src?: string) =>
    renderToBuffer(
      <ContractDocument
        contract={contract}
        events={ordered}
        signatureSrc={src}
      />,
    );

  try {
    return await withTimeout(render(signatureSrc), "PDF render");
  } catch (err) {
    if (!signatureSrc) throw err;
    console.warn("[contracts] retrying PDF without the signature image:", err);
    return await withTimeout(render(undefined), "PDF render (no signature)");
  }
}

/**
 * Renders and files the signed PDF.
 *
 * Throws on failure rather than swallowing, so the caller decides — the
 * signing route logs it and leaves pdfPendingAt set for the sweep, because a
 * missing PDF must never cost anyone their signature.
 */
export async function storeSignedPdf(
  contractId: Id<"contracts">,
  secret: string,
): Promise<void> {
  const loaded = await fetchQuery(api.contracts.getForPdf, {
    secret,
    id: contractId,
  });
  if (!loaded) throw new Error("No such contract.");

  const { contract, events, signatureUrl } = loaded;

  // Inlined as a data URL: react-pdf would otherwise fetch the Convex storage
  // URL itself at render time, adding a network round trip inside the request
  // that is trying to redirect someone to Stripe.
  let signatureSrc: string | undefined;
  if (signatureUrl) {
    try {
      const response = await fetch(signatureUrl);
      if (response.ok) {
        const bytes = Buffer.from(await response.arrayBuffer());
        signatureSrc = `data:image/png;base64,${bytes.toString("base64")}`;
      }
    } catch {
      // Render without it. The image is corroborating, not load-bearing.
    }
  }

  const pdf = await renderContractPdf(contract, events, signatureSrc);

  const uploadUrl = await fetchMutation(api.files.generateServerUploadUrl, {
    secret,
  });
  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: { "content-type": "application/pdf" },
    body: new Uint8Array(pdf),
  });
  if (!upload.ok) throw new Error("Storage upload failed.");

  const { storageId } = (await upload.json()) as { storageId: Id<"_storage"> };

  await fetchMutation(api.contracts.attachSignedPdf, {
    secret,
    contractId,
    storageId,
  });
}
