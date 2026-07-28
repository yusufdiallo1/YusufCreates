export const metadata = { title: "Admin", robots: { index: false } };

export default function AdminPage() {
  return (
    <section>
      <h1 className="text-2xl">Admin</h1>
      <p className="mt-2 text-sm text-secondary">
        Signed in. Content management is being built out next.
      </p>
    </section>
  );
}
