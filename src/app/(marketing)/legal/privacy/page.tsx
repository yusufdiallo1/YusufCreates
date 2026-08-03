import type { Metadata } from "next";
import Link from "next/link";

/**
 * Privacy policy.
 *
 * Written from what this codebase actually does — every claim below was
 * checked against the code, not copied from a template. The processor table
 * names each third party the data genuinely reaches.
 *
 * NOT LEGAL ADVICE. I am not a lawyer. This describes the system accurately
 * and covers the CCPA and GDPR rights that apply, but it has not been reviewed
 * by counsel. Have it reviewed before relying on it for enterprise
 * procurement.
 */

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Yusuf Creates collects, why, how long it is kept, and who processes it.",
};

const UPDATED = "28 July 2026";

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy</h1>
      <p className="legal-updated">Last updated {UPDATED}</p>

      <p>
        This site is run by Yusuf Diallo, trading as Yusuf Creates. It collects
        as little as it can get away with, and this page says exactly what that
        is. If anything here is unclear, write to{" "}
        {/*
          Explicit {" "} rather than a plain space before the newline. JSX
          drops whitespace that sits between a tag and a line break, so
          "…yusufcreates.com and I'll" rendered as "…yusufcreates.comand
          I'll" — the space is in the source and not in the output.
        */}
        <a href="mailto:hello@yusufcreates.com">hello@yusufcreates.com</a>{" "}
        and I&apos;ll answer plainly.
      </p>

      <h2>What is collected, and why</h2>

      <p>
        <strong className="text-primary">If you send an enquiry.</strong> Your
        name, email address, and whatever else you choose to fill in — phone
        number, company, budget range, timeline, and the description of your
        project. A phone number is only required if you ask to be called. This
        is used to reply to you and to quote the work. Nothing else.
      </p>

      <p>
        <strong className="text-primary">
          If you subscribe to the newsletter.
        </strong>{" "}
        Your email address, and which page you subscribed from. Nothing is sent
        until you click the confirmation link — an address that is never
        confirmed is never written to the list.
      </p>

      <p>
        <strong className="text-primary">When you browse.</strong>{" "}
        Page views, the page you came from, and which buttons are clicked. These are tied
        to a random identifier held in your browser&apos;s session storage,
        which is cleared when you close the tab. It is not a cookie, it is not
        shared with anyone, and it cannot identify you.
      </p>

      <p>
        <strong className="text-primary">Anti-spam.</strong> Forms measure how
        long the page was open and include a hidden field that a person never
        sees. Both are used only to discard automated submissions.
      </p>

      <h2>What is never collected</h2>

      <ul>
        <li>Advertising or cross-site tracking identifiers.</li>
        <li>Payment card details. Those go directly to Stripe.</li>
        <li>Anything sold, rented, or shared with data brokers — ever.</li>
      </ul>

      <h2>Who processes it</h2>

      <p>
        These are the only third parties that data reaches, and only for the
        purpose listed.
      </p>

      <table>
        <thead>
          <tr>
            <th>Processor</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Convex</th>
            <td>Database. Enquiries, subscribers and analytics are stored here.</td>
          </tr>
          <tr>
            <th>Vercel</th>
            <td>Hosting and content delivery.</td>
          </tr>
          <tr>
            <th>Resend</th>
            <td>Sends transactional email and the newsletter.</td>
          </tr>
          <tr>
            <th>Cloudflare</th>
            <td>Turnstile, which distinguishes people from bots on forms.</td>
          </tr>
          <tr>
            <th>Stripe</th>
            <td>
              Payments. Card details are entered on Stripe&apos;s own page and
              never touch this site.
            </td>
          </tr>
          <tr>
            <th>Anthropic</th>
            <td>
              Powers the site assistant, where one is available. Conversations
              are not used to train models.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>How long it is kept</h2>

      <ul>
        <li>
          <strong className="text-primary">Enquiries:</strong>{" "}
          kept while there&apos;s an active conversation, and for two years afterwards in
          case you come back. Ask and I&apos;ll delete yours sooner.
        </li>
        <li>
          <strong className="text-primary">Newsletter:</strong> until you
          unsubscribe. Every email has a one-click link.
        </li>
        <li>
          <strong className="text-primary">Analytics:</strong> pageview records
          are anonymous and kept for twelve months.
        </li>
        <li>
          <strong className="text-primary">Invoices and payments:</strong> kept
          for seven years, because tax law requires it.
        </li>
      </ul>

      <h2>Your rights</h2>

      <p>
        Wherever you are, you can ask for a copy of what I hold about you, ask
        for it to be corrected, or ask for it to be deleted. I&apos;ll respond
        within 30 days, and sooner in practice.
      </p>

      <p>
        <strong className="text-primary">
          If you are in California (CCPA/CPRA):
        </strong>{" "}
        you have the right to know what is collected, to have it deleted, to
        correct it, and to opt out of its sale or sharing. To be explicit:{" "}
        <strong className="text-primary">
          I do not sell or share personal information, and never have.
        </strong>{" "}
        There is nothing to opt out of. Exercising any of these rights will
        never result in worse service or different pricing.
      </p>

      <p>
        <strong className="text-primary">
          If you are in the UK, EU, or Saudi Arabia (UK GDPR, GDPR, PDPL):
        </strong>{" "}
        you additionally have the right to restrict or object to processing, to
        data portability, and to complain to your supervisory authority. The
        lawful basis is consent for the newsletter, and legitimate interest for
        replying to an enquiry you sent me.
      </p>

      <p>
        To exercise any of these, use the{" "}
        <Link href="/legal/privacy#request">data request form</Link> below or
        email <a href="mailto:hello@yusufcreates.com">hello@yusufcreates.com</a>
        . No account or verification hoops.
      </p>

      <h2 id="request">Making a request</h2>

      <p>
        Email <a href="mailto:hello@yusufcreates.com">hello@yusufcreates.com</a>{" "}
        with the address you used, and say whether you want a copy, a
        correction, or deletion. I&apos;ll confirm within a couple of days and
        complete it within 30.
      </p>

      <h2>Security</h2>

      <p>
        Everything is served over HTTPS. Secrets live in server-side
        environment variables and are never sent to the browser — the build
        actively scans for leaked credentials and fails if it finds any.
        Invoices are reachable only through an unguessable link, and admin
        access is restricted to a single account with server-side verification
        on every request.
      </p>

      <h2>Changes</h2>

      <p>
        If this policy changes materially, the date at the top changes with it.
        I won&apos;t quietly broaden what is collected.
      </p>
    </>
  );
}
