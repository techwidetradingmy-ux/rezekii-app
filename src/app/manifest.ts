import type { MetadataRoute } from "next";

/**
 * Rezekii added to a phone's home screen (owner, 2 Nov 2026): it opens like an app, full screen without the browser bar,
 * straight into the app, with Rezekii's own logo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rezekii",
    short_name: "Rezekii",
    description: "Rezekii: an AI-powered affiliate platform for TikTok Shop creators and sellers.",
    id: "/app",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#00874f",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
