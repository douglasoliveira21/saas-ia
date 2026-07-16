import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SolvitSoft IA",
    short_name: "SolvitSoft",
    description: "Inteligência Artificial para toda a sua empresa.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f2",
    theme_color: "#17161b",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
