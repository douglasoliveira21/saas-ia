import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://solvitsoft.com.br"),
  applicationName: "SolvitSoft IA",
  title: {
    default: "SolvitSoft IA — Inteligência Artificial para Empresas",
    template: "%s | SolvitSoft IA",
  },
  description: "Plataforma empresarial com mais de 100 agentes de inteligência artificial para automatizar processos, analisar documentos, criar conteúdos e aumentar a produtividade.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
  keywords: ["inteligência artificial para empresas", "agentes de IA", "automação empresarial", "IA Microsoft 365", "SolvitSoft"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "SolvitSoft IA — Sua empresa inteira trabalhando com IA",
    description: "Agentes inteligentes treinados para automatizar todos os setores da sua empresa.",
    url: "https://solvitsoft.com.br",
    siteName: "SolvitSoft IA",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SolvitSoft IA",
    description: "Inteligência Artificial para toda a sua empresa.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
