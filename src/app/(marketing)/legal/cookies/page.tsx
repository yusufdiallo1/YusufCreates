import type { Metadata } from "next";
import Link from "next/link";

/**
 * Cookie policy.
 *
 * Short because the honest answer is short. Verified against the code: the
 * analytics identifier is sessionStorage, not a cookie, and the only cookie
 * set anywhere is the Convex Auth session — which exists solely so the admin
 * can stay signed in.
 */

export const metadata: Metadata = {
  title: "Cookies",
  description:
    "This site uses no tracking cookies. First-party analytics only, with no personal data.",
};

const UPDATED = "28 July 2026";

export default function CookiesPage() {
  return (
    <>
      <h1>Cookies</h1>
      <p className="legal-updated">Last updated {UPDATED}</p>

      <p>
        This site sets no tracking cookies, no advertising cookies, and no
        third-party cookies. There is no consent banner because there is
        nothing to consent to.
      </p>

      <h2>What is actually stored in your browser</h2>

      <table>
        <thead>
          <tr>
            <th>What</th>
            <th>Where</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Analytics identifier</th>
            <td>Session storage</td>
            <td>
              A random string so repeat page views within one visit count as
              one visit. Cleared when you close the tab. Not a cookie, and not
              linked to you.
            </td>
          </tr>
          <tr>
            <th>Currency preference</th>
            <td>Local storage</td>
            <td>Remembers which currency you chose on the pricing page.</td>
          </tr>
          <tr>
            <th>Sign-in session</th>
            <td>Cookie</td>
            <td>
              Only set if you sign in to the admin area. That is me, not you.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Analytics</h2>

      <p>
        Traffic measurement is first-party: pageviews and button clicks are
        recorded on my own database, with no personal data and no third-party
        script. There is no Google Analytics, no Meta pixel, and nothing that
        follows you to another site.
      </p>

      <p>
        Clearing your browser storage removes all of the above. Nothing breaks
        if you do.
      </p>

      <p>
        More detail on what is collected is in the{" "}
        <Link href="/legal/privacy">privacy policy</Link>.
      </p>
    </>
  );
}
