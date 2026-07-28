import type { Metadata } from "next";
import Link from "next/link";

/**
 * Website terms of use.
 *
 * DELIBERATELY NARROW SCOPE. This covers using the website — not the contract
 * for doing client work, which lives in the signed proposal and needs a
 * lawyer.
 *
 * I have not drafted liability caps, warranty disclaimers, indemnities, IP
 * assignment or governing-law clauses here, because those are binding contract
 * terms and writing them without counsel is how you end up with something
 * unenforceable, or enforceable in a way you did not intend. The project
 * contract is where they belong, and it should be reviewed once by a lawyer as
 * a fixed cost against every future engagement.
 */

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for yusufcreates.com.",
};

const UPDATED = "28 July 2026";

export default function TermsPage() {
  return (
    <>
      <h1>Terms of use</h1>
      <p className="legal-updated">Last updated {UPDATED}</p>

      <p>
        These terms cover using this website. They are not the contract for
        project work — that is set out in the proposal you sign, which takes
        precedence over anything here.
      </p>

      <h2>Using the site</h2>

      <p>
        Read it, share it, quote it. Please don&apos;t scrape it wholesale,
        attempt to reach the admin area or other people&apos;s invoice links,
        or use the contact forms to send bulk or automated messages.
      </p>

      <h2>What&apos;s mine</h2>

      <p>
        The writing, design and code of this site are mine. Client project
        names and logos shown in the work section belong to those clients and
        appear with their permission.
      </p>

      <p>
        Work I build for you is a different matter:{" "}
        <strong className="text-primary">
          you own it outright once the final invoice is paid
        </strong>{" "}
        — code, designs, domains and accounts, transferred to you. That is set
        out properly in the project contract.
      </p>

      <h2>Prices and availability</h2>

      <p>
        Prices shown are current and in the currency you have selected. They
        are an indication of cost, not a binding quote — the quote is the
        figure in your proposal, and it is fixed once you accept it. Currency
        conversions other than pegged rates are approximate.
      </p>

      <h2>Accuracy</h2>

      <p>
        I keep this site accurate and correct mistakes when I find them, but I
        can&apos;t promise it is free of errors or always available. Nothing
        here is professional advice for your specific situation — that is what
        the conversation is for.
      </p>

      <h2>Third-party services</h2>

      <p>
        Payments run through Stripe, email through Resend, and hosting through
        Vercel. Their terms govern their part of the service. The{" "}
        <Link href="/legal/privacy">privacy policy</Link> lists each one and
        what it handles.
      </p>

      <h2>Getting in touch</h2>

      <p>
        Questions about these terms:{" "}
        <a href="mailto:hello@yusufcreates.com">hello@yusufcreates.com</a>.
      </p>

      <p className="mt-10 text-xs">
        These terms cover website use only. The terms governing a project —
        scope, payment schedule, revisions, intellectual property, liability
        and governing law — are in the proposal and contract for that project.
      </p>
    </>
  );
}
