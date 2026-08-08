import { Suspense } from "react";
import { fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ScrollTriggerProvider } from "@/components/motion/ScrollTriggerProvider";
import { AmbientTemperature } from "@/components/motion/AmbientTemperature";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Tracker } from "@/components/analytics/Tracker";
import { ChatLauncher } from "@/components/chat/ChatLauncher";
import { PromoBanner } from "@/components/marketing/PromoBanner";
import { CookieNotice } from "@/components/marketing/CookieNotice";
import { ReferralWelcome } from "@/components/marketing/ReferralWelcome";
import { EntryStateProvider } from "@/components/providers/EntryStateProvider";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * The domains of sites I have built, so a visitor arriving from one can be
   * recognised as referred.
   *
   * Fetched HERE rather than in the provider. The provider is a client
   * component and would have to round-trip for this list before it could
   * classify anyone — "referred" would land several hundred milliseconds in,
   * long after the hero it is meant to change. On the server it is already in
   * the payload.
   *
   * Degrades to an empty list, which classifies every referred visitor as
   * whatever they otherwise are. A Convex outage should cost a nicety, not
   * the page.
   */
  const clientDomains = isConvexConfigured
    ? await fetchQuery(api.projects.clientDomains, {}).catch(() => [])
    : [];

  return (
    /* ScrollTriggerProvider sits ABOVE SmoothScroll so it claims the RAF
       ticker before Lenis is constructed, letting GSAP and Lenis share one
       clock. SmoothScroll self-drives if the claim never arrives, so the
       ordering is an optimisation rather than a correctness requirement —
       but getting it right means that fallback never has to fire. */
    <ScrollTriggerProvider>
      {/* Smoothing is deliberately scoped to marketing pages. The admin layout
          scrolls natively — smoothing a data table is hostile. */}
      <SmoothScroll>
        {/* How this visitor arrived, resolved once per session. Everything
            that adapts to a return visit reads it through useEntryState.
            Renders children unconditionally — see the provider, and THE SSR
            RULE in lib/entryState.ts for what consumers may branch on. */}
        <EntryStateProvider clientDomains={clientDomains}>
        <div className="flex min-h-full flex-col">
          {/* One layer for the whole page, behind everything. Per-section
              backgrounds would band at their boundaries. */}
          <AmbientTemperature />

          {/* First-party, cookieless. See src/lib/track.ts. */}
          <Tracker />
          <ScrollProgress />
          <PromoBanner />
          <Nav />

          {/* Padded for the fixed nav so content never starts underneath it. */}
          <main id="main" className="flex-1">
            {children}
          </main>

          <Footer />

          {/* Site assistant. Suggestions come from the KB priority field. */}
          <ChatLauncher />

          {/* useSearchParams needs a Suspense boundary or the whole route opts
            out of static rendering. */}
          <Suspense fallback={null}>
            <ReferralWelcome />
          </Suspense>

          {/* A notice, not a consent gate — there is no tracking cookie to
            consent to. See the component for why that distinction matters. */}
          <CookieNotice />
        </div>
        </EntryStateProvider>
      </SmoothScroll>
    </ScrollTriggerProvider>
  );
}
