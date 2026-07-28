import { CustomCursor } from "@/components/ui/CustomCursor";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Tracker } from "@/components/analytics/Tracker";
import { ChatLauncher } from "@/components/chat/ChatLauncher";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Smoothing is deliberately scoped to marketing pages. The admin layout
    // scrolls natively — smoothing a data table is hostile.
    <SmoothScroll>
      <div className="flex min-h-full flex-col">
        {/* First-party, cookieless. See src/lib/track.ts. */}
        <Tracker />
        <ScrollProgress />
        <CustomCursor />
        <Nav />

        {/* Padded for the fixed nav so content never starts underneath it. */}
        <main id="main" className="flex-1">
          {children}
        </main>

        <Footer />

        {/* Site assistant. Suggestions come from the KB priority field. */}
        <ChatLauncher />
      </div>
    </SmoothScroll>
  );
}
