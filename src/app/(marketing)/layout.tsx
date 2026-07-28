import { CustomCursor } from "@/components/ui/CustomCursor";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <CustomCursor />
      <Nav />

      {/* Padded for the fixed nav so content never starts underneath it. */}
      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
