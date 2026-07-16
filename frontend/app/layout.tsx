import type { Metadata } from "next";
import "@fontsource-variable/nunito-sans";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "SolvitSoft IA",
  title: {
    default: "SolvitSoft IA — Seu ambiente de Inteligência Artificial",
    template: "%s | SolvitSoft IA",
  },
  description: "Plataforma empresarial de inteligência artificial com agentes especializados, memória, criação de imagens, documentos e pesquisa.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
