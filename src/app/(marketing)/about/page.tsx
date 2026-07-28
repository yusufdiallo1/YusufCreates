import type { Metadata } from "next";
import Link from "next/link";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";
import { NameMark } from "@/components/ui/NameMark";
import { personJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description:
    "Yusuf Diallo — independent developer building multilingual software for individuals and businesses, worldwide.",
  alternates: { canonical: `${SITE.url}/about` },
};

const WORKING_WITH_ME = [
  {
    title: "You talk to me, not an account manager",
    body: "The person you brief is the person writing the code. Nothing gets lost being passed along.",
  },
  {
    title: "Fixed price, agreed up front",
    body: "You know the number before I start. If scope changes we agree a new one — no surprise invoices.",
  },
  {
    title: "You own everything",
    body: "Code, domain, accounts, all in your name. If you want to move to someone else, nothing is holding you.",
  },
  {
    title: "I say no to work that will not help",
    body: "If a cheaper approach or an off-the-shelf tool would serve you better, I will say so.",
  },
];

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 pt-32 pb-24">
        {/* The name is set with the Y and D drawn as marks. */}
        <h1 className="text-4xl">
          <NameMark />
        </h1>
        <TextReveal as="p" by="word" className="mt-4 block text-secondary">
          Independent developer. Here is how I work and who I work with.
        </TextReveal>

        <Parallax distance={28} className="mt-12">
          {/* TODO: replace with a real portrait at public/portrait-large.jpg */}
          <div className="hairline aspect-[3/2] w-full overflow-hidden rounded-lg bg-surface-1" />
        </Parallax>

        <section className="mt-16">
          <h2 className="text-2xl">The story</h2>
          <Reveal>
            <p className="mt-4 text-secondary">
              I started by fixing other people&apos;s websites. Small
              businesses would come to me with something an agency had built
              and abandoned, or a template that broke the moment they tried to
              change a price. The problem was almost never the design. It was
              that nobody had built the thing to be maintained by the person
              who owned it.
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-4 text-secondary">
              So now I build the whole thing properly. Marketing sites,
              booking systems, client portals, payment flows — the software a
              small business actually runs on. I use Next.js and Convex because
              they let one person ship and maintain something that would
              normally need a team.
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-4 text-secondary">
              I work with whoever is making the decision — a founder, an
              owner-operator, or one person with an idea and no company behind
              it. Individuals are not a smaller version of a business client;
              often the work is clearer because there is nobody to convince.
            </p>
          </Reveal>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl">What working with me is like</h2>
          <ul className="mt-6 divide-y divide-[color:var(--border-hairline)]">
            {WORKING_WITH_ME.map((item, index) => (
              <li key={item.title}>
                <Reveal delay={index * 0.05}>
                  <div className="py-5">
                    <h3 className="text-base text-primary">{item.title}</h3>
                    <p className="mt-1 text-sm text-secondary">{item.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl">How I work with clients</h2>
          <Reveal>
            <p className="mt-4 text-secondary">
              Remote, worldwide. Timezone overlap with Europe and Africa is
              easy, and I keep evening hours when a project needs the Americas
              or East Asia.
            </p>
          </Reveal>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl">Languages</h2>
          <Reveal>
            <p className="mt-4 text-secondary">
              I build multilingual sites properly: English, Arabic, French,
              Russian, Swedish and anything else with a translator behind it.
              That means locale-correct dates, numbers and currency, type that
              is set for each script rather than defaulted, and content
              structure that survives translation instead of breaking at the
              first long German compound.
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-4 text-secondary">
              Right-to-left support for Arabic, Hebrew and Farsi is the part
              most people get wrong: mirrored layout, logical properties rather
              than hardcoded left and right, and typography that is chosen not
              inherited. A flipped stylesheet with English assumptions
              underneath is visible immediately to anyone who reads the
              language. It is not difficult — it just has to be decided at the
              start rather than bolted on.
            </p>
          </Reveal>
        </section>

        <Reveal>
          <div className="hairline-t mt-16 pt-10">
            <p className="text-lg">Working on something?</p>
            <Link
              href="/start"
              className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
            >
              Start a project
            </Link>
          </div>
        </Reveal>
      </div>
    </>
  );
}
