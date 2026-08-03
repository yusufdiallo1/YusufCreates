interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

/**
 * A single figure with a label.
 *
 * The label and hint used to be `opacity-60` and `opacity-50` on inherited
 * text, which measures around 2.3:1 against the admin surfaces — well under
 * the 4.5:1 body-text minimum, and unreadable rather than merely quiet.
 * Opacity is not a contrast tool: it blends the text toward the background,
 * so every step down is a step further from legible.
 *
 * They now use the real tokens, which are verified against every surface they
 * sit on. The label reads as secondary because it is smaller and uppercase,
 * not because it is faded.
 */
export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="admin-card">
      <p className="admin-meta">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-secondary">{hint}</p> : null}
    </div>
  );
}
