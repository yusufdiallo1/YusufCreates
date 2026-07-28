import type { Metadata } from "next";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  // This page is for one person; keep it out of search results entirely.
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main
      id="main"
      className="flex min-h-svh items-center justify-center px-6 py-24"
    >
      <SignInForm />
    </main>
  );
}
