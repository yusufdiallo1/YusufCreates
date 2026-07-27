import { SITE } from "@/lib/constants";

export default function HomePage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {SITE.name}
      </h1>
      <p className="mt-4 max-w-xl text-lg opacity-70">{SITE.description}</p>
    </section>
  );
}
