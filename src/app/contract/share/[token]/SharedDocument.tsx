import { Logo } from "@/components/ui/Logo";
import { renderMarkdown } from "@/lib/markdown";

/**
 * What the two codes bought.
 *
 * A server component, so the document only ever reaches a browser that
 * presented a valid session — there is no client-side branch hiding data that
 * was sent regardless.
 */
export function SharedDocument({
  token,
  session,
}: {
  token: string;
  session: {
    scope: "contract" | "pdf" | "audit";
    clientName: string;
    signedAt?: number;
    body: string | null;
    bodyHash: string | null;
    auditRoot: string | null;
    signedPdfFileId: string | null;
    events: {
      _id: string;
      seq: number;
      type: string;
      at: number;
      ip?: string;
      hash: string;
    }[];
  };
}) {
  const stamp = (ts: number | undefined) =>
    ts ? `${new Date(ts).toISOString().replace("T", " ").slice(0, 19)} UTC` : "—";

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Logo variant="mark" className="h-7 w-auto" />

      <div className="mt-10">
        <p className="font-mono text-xs tracking-[0.06em] text-secondary">
          Shared document
        </p>
        <h1 className="mt-3 text-3xl">{session.clientName}</h1>
        <p className="mt-2 text-sm text-secondary">
          Signed {stamp(session.signedAt)}
        </p>

        {session.signedPdfFileId && session.scope !== "audit" ? (
          <a
            href={`/contract/share/${token}/pdf`}
            className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas"
          >
            Open the signed PDF
          </a>
        ) : null}

        {session.body ? (
          <article className="legal-prose mt-10">
            {renderMarkdown(session.body)}
          </article>
        ) : null}

        {session.scope === "audit" ? (
          <section className="mt-12">
            <h2 className="text-lg">Signature record</h2>
            <dl className="mt-4 space-y-1.5 text-[13px]">
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-secondary">Text</dt>
                <dd className="min-w-0 font-mono text-[11px] break-all text-primary">
                  {session.bodyHash ?? "—"}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-secondary">Chain root</dt>
                <dd className="min-w-0 font-mono text-[11px] break-all text-primary">
                  {session.auditRoot ?? "—"}
                </dd>
              </div>
            </dl>

            <ol className="mt-6 space-y-3">
              {session.events.map((event) => (
                <li key={event._id} className="hairline rounded-lg p-3">
                  <p className="text-[13px] text-primary">
                    {event.seq}. {event.type.replace(/_/g, " ")}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {stamp(event.at)}
                    {event.ip ? ` · ${event.ip}` : ""}
                  </p>
                  <p className="mt-1 font-mono text-[10px] break-all text-secondary">
                    {event.hash}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <p className="mt-14 text-xs text-secondary">
          This access expires 30 minutes after you signed in. Reopen the link
          from your email to get back in.
        </p>
      </div>
    </main>
  );
}
