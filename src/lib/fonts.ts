import localFont from "next/font/local";

/**
 * Inter Variable, self-hosted from @fontsource-variable/inter.
 *
 * This is the fallback tier of the stack. On Apple platforms the OS-installed
 * copy of SF Pro wins before Inter is ever reached — SF Pro is deliberately
 * NOT bundled here, as Apple's licence does not permit self-hosting or serving
 * it as a webfont on a public website.
 *
 * `display: "swap"` keeps text visible during load; `adjustFontFallback`
 * matches metrics against Arial to limit layout shift.
 */
export const inter = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
      weight: "300 600",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2",
      weight: "300 600",
      style: "italic",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: "Arial",
});
