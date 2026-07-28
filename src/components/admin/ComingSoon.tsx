/**
 * Placeholder for an admin section that is scaffolded but not yet built.
 *
 * These exist so every sidebar link resolves. A nav item that 404s reads as a
 * broken app; one that says "not built yet" reads as an app under
 * construction, which is the truth.
 */
export function ComingSoon({ section }: { section: string }) {
  return (
    <div>
      <h1 className="text-2xl">{section}</h1>
      <div className="admin-card mt-6">
        <p className="text-sm text-secondary">
          This section is scaffolded but not built yet. The route exists so
          navigation works end to end; the screen lands in a later pass.
        </p>
      </div>
    </div>
  );
}
