import type { Metadata, Viewport } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { inter } from "@/lib/fonts";
import { isConvexConfigured } from "@/lib/convex-api";
import { SITE } from "@/lib/constants";
import { Watermark } from "@/components/ui/Watermark";
import { CapabilityProvider } from "@/components/providers/CapabilityProvider";
import { MotionDebug } from "@/components/dev/MotionDebug";

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
  /*
   * PNG first, SVG second.
   *
   * Google's favicon crawler does not use SVG, and neither do several
   * contexts that show a site icon — which is why the search listing rendered
   * a generic globe. The PNGs are drawn on the brand canvas rather than
   * transparent, because Google composites favicons onto a white card and a
   * transparent dark mark vanishes into it.
   */
  /*
   * ORDER MATTERS, and so does /favicon.ico being here at all.
   *
   * Google picks the LARGEST square icon that is a multiple of 48px, so
   * icon-192.png (192 = 48 × 4) is listed first — the 32px PNG led the list
   * before, and a 32px icon is not a multiple of 48, so the crawler had
   * nothing it considered valid at the front.
   *
   * /favicon.ico exists in public/ but was never declared, so no
   * <link rel="icon"> was emitted for it. Browsers probe the root path anyway;
   * crawlers are less forgiving.
   *
   * The remaining half of the globe problem is not in this file — see the
   * www→apex redirect in next.config.ts. Icon hrefs resolve against
   * metadataBase, so while the site answered on both hosts these pointed at a
   * different origin than the page being crawled.
   */
  icons: {
    icon: [
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Feed autodiscovery. Without this a reader has to be handed the URL by
  // hand, which nobody does.
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: SITE.name }],
    },
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

/*
 * `resizes-content` is the reason the chat panel survives the keyboard.
 *
 * By default the on-screen keyboard OVERLAYS the viewport: the layout keeps
 * its full height and the browser simply scrolls, so a bottom-anchored input
 * ends up underneath the keys. With this, the visual viewport shrinks and
 * anything sized in dvh resizes with it, which is what a chat input needs.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
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
      /*
       * The glass script in <head> writes CSS custom properties onto this
       * element's style attribute before React hydrates, so the client sees a
       * `style` attribute the server never rendered. React reports that as a
       * hydration attribute mismatch on <html>.
       *
       * suppressHydrationWarning is the sanctioned answer for exactly this
       * shape of problem — a pre-paint script mutating the document element —
       * and it is scoped to THIS element's attributes only, not to its
       * subtree, so nothing real is being hidden. The alternative is a painted
       * frame at the wrong material on every load.
       */
      suppressHydrationWarning
      data-theme="dark"
      // Must match SSR_TIER in lib/capability.ts. Rendered by the server so the
      // tier clamps in globals.css apply on first paint; CapabilityProvider
      // replaces it one frame after hydration once the device is known.
      data-capability-tier="reduced"
      className={`${inter.variable} min-h-full antialiased`}
    >
      {/* min-h-dvh, not min-h-full. `min-height: 100%` resolves against the
          parent's HEIGHT, and <html> only has a min-height — so the
          percentage had nothing to resolve against, collapsed, and short
          pages left the footer floating mid-screen with dead space beneath
          it. dvh measures the viewport directly, and unlike `h-full` it still
          lets the box grow past the fold, so touch scrolling is unaffected. */}
      <head>
        {/*
          Glass settings, applied BEFORE first paint.

          Inline and synchronous in <head> on purpose. The stored value lives
          in localStorage, which a server render cannot see, so without this
          every visitor would get one painted frame at the default material
          and then a jump to theirs — the same class of flash that next-themes
          exists to prevent, and far more visible because it moves every
          surface on the page at once.

          It writes the same variables the React control writes, from the same
          mapping in lib/glass.ts, duplicated here in plain ES5 because this
          has to run with no bundle, no modules and no framework available.
          Keep the two in step: the numbers are the visual contract.

          Failures are swallowed. Private browsing throws on localStorage, and
          a theming preference is never worth a blank page — the CSS defaults
          already render correctly on their own.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
var d=document.documentElement,s=null;
try{var r=localStorage.getItem('yc.glass');if(r){var p=JSON.parse(r);
if(typeof p.frost==='number'&&typeof p.contrast==='number')s=p;}}catch(e){}
if(!s){s={frost:55,contrast:30};
try{if(matchMedia('(prefers-reduced-transparency: reduce)').matches)s.frost=95;
if(matchMedia('(prefers-contrast: more)').matches)s.contrast=80;}catch(e){}}
var c=function(v){return Math.min(100,Math.max(0,v))/100;};
var f=c(s.frost),k=c(s.contrast),n=function(x){return Math.round(x*1000)/1000;};
d.style.setProperty('--glass-alpha',String(n(0.1+0.86*f)));
d.style.setProperty('--glass-blur',(Math.round((28-28*f)*10)/10)+'px');
d.style.setProperty('--glass-refraction',s.frost>70?'0':'1');
d.style.setProperty('--glass-backing','rgba(8, 9, 10, '+n(0.85*k)+')');
d.style.setProperty('--separator-alpha',String(n(0.08+0.24*k)));
d.style.setProperty('--outline-alpha',String(n(0.14+0.31*k)));
d.style.setProperty('--specular-strength',String(n(1-k)));
}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {/* Site-wide, not marketing-only: the tier attribute drives the blur
            clamps in globals.css, which the admin and portal glass surfaces
            read too. Renders children unconditionally — gating on detection
            would leave the payload blank and cost the LCP. */}
        <CapabilityProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </CapabilityProvider>

        {/* Every page, including the portal and the token-authed pages that
            sit outside the marketing layout. */}
        <Watermark />

        {/* ?debug=motion. Compiled out of production builds. */}
        <MotionDebug />
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
