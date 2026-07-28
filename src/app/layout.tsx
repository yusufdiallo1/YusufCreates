import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { inter } from "@/lib/fonts";
import { isConvexConfigured } from "@/lib/convex-api";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  // Required for opengraph-image to emit an absolute URL. Scrapers reject a
  // relative one, which is why a share preview falls back to scavenging the
  // first image it finds on the page.
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.name,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.svg", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    url: SITE.url,
    locale: "en_US",
  },
  twitter: {
    // summary_large_image is what gives the wide card; the default "summary"
    // crops to a small square and loses the headline entirely.
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shell = (
    // Dark is the default; `data-theme="light"` on <html> flips the palette.
    // min-h-full, never h-full. `height: 100%` pins the <html> box to the
    // viewport while the content overflows past it, which kills touch
    // scrolling on mobile — the wheel still works, so it only shows on a
    // phone. min-height lets the box grow with the page.
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} min-h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );

  // The server provider must wrap <html> so the auth token reaches both server
  // components and the client provider. It throws without a deployment URL, so
  // before `npx convex dev` has run the shell is rendered on its own and the
  // marketing site still works.
  if (!isConvexConfigured) return shell;

  return (
    <ConvexAuthNextjsServerProvider>{shell}</ConvexAuthNextjsServerProvider>
  );
}
