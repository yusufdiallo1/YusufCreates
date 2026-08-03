import { Suspense } from "react";
import { CustomCursor } from "@/components/ui/CustomCursor";
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

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <div className="flex min-h-full flex-col">
          {/* One layer for the whole page, behind everything. Per-section
              backgrounds would band at their boundaries. */}
          <AmbientTemperature />

          {/* First-party, cookieless. See src/lib/track.ts. */}
          <Tracker />
          <ScrollProgress />
          <CustomCursor />
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
      </SmoothScroll>
    </ScrollTriggerProvider>
  );
}
