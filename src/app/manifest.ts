import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

/**
 * Web app manifest.
 *
 * Chiefly here for the icons: Android and installed-PWA contexts read them
 * from here rather than from the <link> tags, so without it those surfaces
 * fall back to a screenshot of the page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "YusufCreates",
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#08090a",
    theme_color: "#08090a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
