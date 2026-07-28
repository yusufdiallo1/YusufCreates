/**
 * Shared shell for the legal pages.
 *
 * Narrow measure and generous leading — these are read, not skimmed, and a
 * procurement reviewer going through them line by line deserves a comfortable
 * column rather than the full page width.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <div className="legal-prose">{children}</div>
    </main>
  );
}
