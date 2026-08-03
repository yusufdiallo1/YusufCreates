/**
 * The admin page header.
 *
 * This markup was copy-pasted into fifteen screens, which is why the title
 * size, the description colour and the gap between them had all drifted apart.
 * One component means the typography pass lands everywhere at once.
 *
 * The description is deliberately typed as a single string and rendered on one
 * line. Operational chrome is read a hundred times and skimmed every time; the
 * personality belongs in empty states, confirmations and errors, which are
 * read once and land.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  /** One short line. If it needs two, it belongs somewhere else. */
  description?: string;
  /** The primary action for the page, rendered top-right. */
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="admin-title">{title}</h1>
        {description ? (
          <p className="admin-subtitle mt-1">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
