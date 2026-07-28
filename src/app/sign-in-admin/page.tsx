import type { Metadata } from "next";
import { AdminSignIn } from "./AdminSignIn";

export const metadata: Metadata = {
  title: "Admin",
  // One person uses this page. Keep it out of search entirely.
  robots: { index: false, follow: false, nocache: true },
};

export default function SignInAdminPage() {
  return (
    <main
      id="main"
      className="flex min-h-svh items-center justify-center px-6 py-24"
    >
      <AdminSignIn />
    </main>
  );
}
