interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-black/10 p-5 dark:border-white/15">
      <p className="text-sm opacity-60">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs opacity-50">{hint}</p> : null}
    </div>
  );
}
