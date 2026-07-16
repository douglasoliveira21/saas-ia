import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://solvitsoft.com.br"),
  title: "SolvitSoft IA | Inteligência Artificial para toda a sua empresa",
  description: "Mais de 100 agentes de IA especializados para automatizar processos, criar, pesquisar e transformar a produtividade da sua empresa.",
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
