import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BingoBolla",
    short_name: "BingoBolla",
    description: "Bingo y slots sweepstakes - premios reales",
    start_url: "/lobby",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08080c",
    theme_color: "#FF3D7F",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
