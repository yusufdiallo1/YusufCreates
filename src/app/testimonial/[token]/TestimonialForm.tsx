"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import { FieldError } from "@/components/ui/FieldError";

/**
 * Where a client writes their testimonial.
 *
 * Reached by a one-use token from inside their portal, while the project is
 * still open. That timing is the whole point: the only moment someone will
 * write about work they are pleased with is the moment they receive it. A
 * request that arrives a fortnight later arrives after they have moved on.
 *
 * Optional, always. A testimonial extracted as a condition of delivery is
 * worth nothing to either of us — so nothing here is required except the
 * words themselves and a name to put to them.
 */

/**
 * Job titles, as a fixed list.
 *
 * Free text produced "CEO", "ceo", "C.E.O." and "Chief Exec" for the same
 * role, which looks careless when four testimonials sit next to each other on
 * a page. A list also answers the question faster than a text box does.
 */
const POSITIONS = [
  "Founder",
  "Co-founder",
  "CEO",
  "CTO",
  "Product Manager",
  "Marketing Lead",
  "Designer",
  "Engineer",
  "Operations",
  "Owner",
  "Director",
  "Consultant",
  "Other",
];

export function TestimonialForm({ token }: { token: string }) {
  const submit = useMutation(api.testimonials.submitByToken);

  const [author, setAuthor] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [role, setRole] = useState("");
  const [quote, setQuote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <h1 className="text-2xl text-primary">Thank you — genuinely.</h1>
        <p className="mt-4 text-sm text-secondary">
          That means a lot. I read every one, and it goes up on the site once I
          have. Nothing else is needed from you.
        </p>
      </div>
    );
  }

  const ready = author.trim() !== "" && quote.trim() !== "";

  return (
    <div className="mx-auto max-w-lg px-5 py-16 sm:px-6">
      <h1 className="text-2xl sm:text-3xl">Would you say a few words?</h1>
      <p className="mt-3 text-sm text-secondary">
        Only if you want to — it changes nothing about your project either way.
        A couple of honest sentences is worth more than a paragraph of praise.
      </p>

      <div className="mt-10 space-y-5">
        <Field
          id="t-name"
          label="Your name"
          value={author}
          onChange={setAuthor}
          placeholder="Amina Yusuf"
        />

        <Field
          id="t-company"
          label="App or company name"
          value={company}
          onChange={setCompany}
          placeholder="Roastery Co"
        />

        <Field
          id="t-website"
          label="Its web address"
          value={website}
          onChange={setWebsite}
          placeholder="https://"
          help="Shown as a link on your testimonial — a quote someone can click through and check is worth more than one they cannot."
        />

        <div>
          <label htmlFor="t-role" className="text-sm text-secondary">
            Your position
          </label>
          <select
            id="t-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-2.5 text-base text-primary sm:text-sm"
          >
            <option value="">Choose one</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="t-quote" className="text-sm text-secondary">
            What you would tell someone considering it
          </label>
          <textarea
            id="t-quote"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={5}
            maxLength={1200}
            placeholder="What you needed, what it was like to work through, and whether it did the job."
            /* 16px so iOS does not zoom the page when it takes focus. */
            className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-base text-primary placeholder:text-secondary sm:text-sm"
          />
        </div>

        <FieldError>{error}</FieldError>

        <div className="pt-2">
          <SlideToConfirm
            purpose="submit-lead"
            label="Slide to send"
            ariaLabel="Send your testimonial"
            disabled={!ready}
            onConfirm={async () => {
              if (!isConvexConfigured) return;
              setError(null);
              const res = await submit({
                token,
                author: author.trim(),
                company: company.trim() || undefined,
                website: website.trim() || undefined,
                role: role || undefined,
                quote: quote.trim(),
              });
              if (!res.ok) {
                /*
                 * The token is consumed on submit, so the usual reason to be
                 * here is a second attempt — which means the first one
                 * worked. Saying "already sent" is both truthful and calmer
                 * than "invalid link".
                 */
                setError("That link has already been used. Nothing more to do.");
                return;
              }
              setDone(true);
            }}
          />
          <p className="mt-3 text-xs text-secondary">
            It goes up once I have read it — never automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  help,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  help?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-describedby={help ? `${id}-help` : undefined}
        className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-2.5 text-base text-primary placeholder:text-secondary sm:text-sm"
      />
      {help ? (
        <p id={`${id}-help`} className="mt-1.5 text-xs text-secondary">
          {help}
        </p>
      ) : null}
    </div>
  );
}
