export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm opacity-70">
        Auth-gated area. Wire up Convex Auth in the admin layout.
      </p>
    </section>
  );
}
