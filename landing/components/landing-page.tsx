"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, BarChart3, Blocks, Bot, BrainCircuit, BriefcaseBusiness,
  Check, ChevronRight, CircleDollarSign, FileSearch, Files, Headphones,
  HeartHandshake, Laptop, Layers3, LockKeyhole, Mail, Megaphone, Menu,
  PackageSearch, Palette, Search, ShieldCheck, Sparkles, Users, Warehouse,
  X, Zap,
} from "lucide-react";

const AmbientOrb = dynamic(() => import("./ambient-orb"), { ssr: false });
const APP_URL = "https://app.solvitsoft.com.br/";

const agents = [
  { name: "Comercial", icon: BriefcaseBusiness, accent: "violet" },
  { name: "Atendimento", icon: Headphones, accent: "blue" },
  { name: "Marketing", icon: Megaphone, accent: "pink" },
  { name: "Financeiro", icon: CircleDollarSign, accent: "green" },
  { name: "Jurídico", icon: ShieldCheck, accent: "amber" },
  { name: "Recursos Humanos", icon: Users, accent: "cyan" },
  { name: "Estoque", icon: Warehouse, accent: "orange" },
  { name: "Logística", icon: PackageSearch, accent: "blue" },
  { name: "Tecnologia", icon: Laptop, accent: "violet" },
  { name: "Business Intelligence", icon: BarChart3, accent: "green" },
  { name: "Administrativo", icon: Files, accent: "cyan" },
  { name: "Social Media", icon: HeartHandshake, accent: "pink" },
];

const microsoft = [
  ["W", "Word", "Crie, revise e resuma documentos"],
  ["X", "Excel", "Analise dados, fórmulas e dashboards"],
  ["P", "PowerPoint", "Transforme ideias em apresentações"],
  ["O", "Outlook", "Resuma e responda e-mails"],
  ["T", "Teams", "Apoie reuniões e colaboração"],
  ["1", "OneDrive", "Encontre conhecimento nos arquivos"],
];

function goToApp() {
  window.location.href = APP_URL;
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 42 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <Reveal className="section-heading">
      <span className="eyebrow"><Sparkles size={15} /> {eyebrow}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </Reveal>
  );
}

export default function LandingPage() {
  const [prompt, setPrompt] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    let lenis: { raf: (time: number) => void; destroy: () => void } | undefined;
    let frame = 0;
    let ctx: { revert: () => void } | undefined;

    Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ default: Lenis }, { default: gsap }, { ScrollTrigger }]) => {
        lenis = new Lenis({ duration: 1.05, smoothWheel: true });
        const raf = (time: number) => {
          lenis?.raf(time);
          frame = requestAnimationFrame(raf);
        };
        frame = requestAnimationFrame(raf);
        gsap.registerPlugin(ScrollTrigger);
        ctx = gsap.context(() => {
          gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
            gsap.to(element, {
              yPercent: -12,
              ease: "none",
              scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: 1.2 },
            });
          });
        }, rootRef);
      },
    );
    return () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      ctx?.revert();
    };
  }, [reduceMotion]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    goToApp();
  };

  return (
    <main ref={rootRef}>
      <nav className="nav-shell" aria-label="Navegação principal">
        <a className="brand" href="#inicio" aria-label="SolvitSoft - início">
          <span className="brand-mark"><Sparkles size={19} /></span>
          SolvitSoft
        </a>
        <div className={`nav-links ${menuOpen ? "is-open" : ""}`}>
          <a href="#agentes" onClick={() => setMenuOpen(false)}>Agentes</a>
          <a href="#integracoes" onClick={() => setMenuOpen(false)}>Integrações</a>
          <a href="#seguranca" onClick={() => setMenuOpen(false)}>Segurança</a>
          <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a>
        </div>
        <div className="nav-actions">
          <a className="login-link" href={APP_URL}>Entrar</a>
          <a className="button button-small" href={APP_URL}>Começar agora <ArrowRight size={16} /></a>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu" aria-expanded={menuOpen}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <section className="hero" id="inicio">
        <div className="grid-bg" />
        <div className="hero-glow glow-one" />
        <div className="hero-glow glow-two" />
        <AmbientOrb />
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="hero-badge"><span /> A nova força de trabalho da sua empresa</span>
          <h1>Sua empresa inteira trabalhando com <span>Inteligência Artificial.</span></h1>
          <p>Agentes inteligentes treinados para automatizar todos os setores da sua empresa.</p>
          <form className="prompt-box" onSubmit={submit}>
            <div className="prompt-top">
              <Sparkles size={20} />
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Descreva o que sua empresa precisa..."
                aria-label="Descreva o que sua empresa precisa"
              />
            </div>
            <div className="prompt-bottom">
              <span><Zap size={14} /> Mais de 100 especialistas disponíveis</span>
              <button type="submit">Começar Agora <ArrowRight size={18} /></button>
            </div>
          </form>
          <div className="trusted-row">
            <span><Check size={14} /> Comece gratuitamente</span>
            <span><Check size={14} /> Sem cartão de crédito</span>
            <span><Check size={14} /> Pronto em minutos</span>
          </div>
        </motion.div>
        <a href="#agentes" className="scroll-hint" aria-label="Continuar para próxima seção"><span /> Explore</a>
      </section>

      <section className="section agents-section" id="agentes">
        <SectionHeading eyebrow="Uma IA para toda a empresa" title="Um time completo. Em uma única tela." text="Cada área ganha um especialista que entende o trabalho, mantém o contexto e transforma solicitações em resultados." />
        <div className="agent-marquee" data-parallax>
          <div className="agent-grid">
            {agents.map(({ name, icon: Icon, accent }, index) => (
              <motion.article
                className={`agent-card accent-${accent}`}
                key={name}
                whileHover={{ y: -10, rotate: index % 2 ? 1 : -1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
              >
                <div className="agent-icon"><Icon /></div>
                <div><strong>{name}</strong><span>Agente especialista</span></div>
                <span className="online-dot" />
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section specialist-section">
        <div className="split-layout">
          <Reveal className="sticky-copy">
            <span className="eyebrow"><Bot size={16} /> Inteligência especializada</span>
            <h2>Mais de <span className="gradient-text">100 agentes</span> prontos para trabalhar.</h2>
            <p>Não é apenas um chat. É uma operação inteligente que identifica o que você precisa e aciona automaticamente a melhor capacidade para executar cada tarefa.</p>
            <a className="text-link" href={APP_URL}>Conhecer a plataforma <ArrowRight size={17} /></a>
          </Reveal>
          <div className="capabilities">
            {[
              [BrainCircuit, "Entende a intenção", "Identifica automaticamente se a tarefa exige texto, código, análise, imagem ou pesquisa."],
              [Layers3, "Preserva o contexto", "Memória empresarial e histórico conectados para respostas cada vez mais relevantes."],
              [Blocks, "Executa processos", "Agentes especializados colaboram com documentos, sistemas e equipes em uma experiência única."],
              [Zap, "Entrega com velocidade", "Automatiza tarefas demoradas e transforma horas de trabalho em poucos minutos."],
            ].map(([Icon, title, text], index) => {
              const C = Icon as typeof BrainCircuit;
              return (
                <Reveal className="capability-card" key={String(title)}>
                  <span className="capability-number">0{index + 1}</span>
                  <C />
                  <h3>{String(title)}</h3>
                  <p>{String(text)}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section microsoft-section" id="integracoes">
        <SectionHeading eyebrow="Microsoft 365 conectado" title="A IA dentro das ferramentas que sua equipe já usa." text="Crie, analise, responda e automatize sem interromper o fluxo de trabalho." />
        <div className="office-stage">
          <div className="office-glow" />
          <div className="office-core"><Sparkles /><strong>SolvitSoft</strong><span>IA empresarial</span></div>
          <div className="office-grid">
            {microsoft.map(([letter, name, description], index) => (
              <Reveal className={`office-card office-${index}`} key={name}>
                <span className={`office-logo logo-${letter}`}>{letter}</span>
                <div><strong>{name}</strong><p>{description}</p></div>
                <ChevronRight size={18} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section creative-section">
        <div className="creative-layout">
          <Reveal className="creative-copy">
            <span className="eyebrow"><Palette size={16} /> Marketing inteligente</span>
            <h2>Da ideia à campanha. <span className="gradient-text">Em segundos.</span></h2>
            <p>Crie imagens, anúncios, campanhas, posts, textos e identidades visuais com uma inteligência que entende sua marca.</p>
            <div className="check-list">
              {["Conteúdo alinhado à sua marca", "Peças para múltiplos canais", "Variações criativas instantâneas", "Vídeos inteligentes em breve"].map((item) => <span key={item}><Check /> {item}</span>)}
            </div>
          </Reveal>
          <div className="creative-board" data-parallax>
            <motion.div className="creative-card card-a" whileHover={{ rotate: -4, scale: 1.03 }}>
              <div className="poster-orb" /><span>Campanha de lançamento</span><strong>Ideias que movem.</strong>
            </motion.div>
            <motion.div className="creative-card card-b" whileHover={{ rotate: 3, scale: 1.03 }}>
              <div className="product-shape" /><small>NOVA COLEÇÃO</small><strong>Designed for tomorrow.</strong>
            </motion.div>
            <motion.div className="creative-card card-c" whileHover={{ y: -8 }}>
              <Sparkles /><span>12 variações criadas</span>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section memory-section">
        <div className="memory-shell">
          <div className="memory-visual" aria-hidden="true">
            <div className="brain-core"><BrainCircuit /></div>
            {["Processos", "Produtos", "Clientes", "Cultura", "Histórico", "Linguagem"].map((label, index) => (
              <span className={`memory-node node-${index + 1}`} key={label}><i />{label}</span>
            ))}
            <div className="memory-ring ring-one" /><div className="memory-ring ring-two" />
          </div>
          <Reveal className="memory-copy">
            <span className="eyebrow light"><BrainCircuit size={16} /> Memória inteligente</span>
            <h2>Uma inteligência que cresce junto com a sua empresa.</h2>
            <p>A SolvitSoft aprende continuamente sobre processos, produtos, clientes, documentos, cultura e linguagem. Quanto mais usada, mais contextual e valiosa ela fica.</p>
            <div className="memory-stat"><strong>Contexto contínuo</strong><span>Conhecimento preservado entre conversas e projetos</span></div>
          </Reveal>
        </div>
      </section>

      <section className="section search-section">
        <SectionHeading eyebrow="Pesquisa empresarial" title="Encontre qualquer informação em segundos." text="Todo o conhecimento da empresa pesquisável, compreendido e transformado em respostas úteis." />
        <Reveal className="search-demo">
          <div className="search-bar"><Search /><span>Qual foi o faturamento do produto X no último trimestre?</span><kbd>↵</kbd></div>
          <div className="search-results">
            <div className="answer-preview"><span className="thinking"><Sparkles /> Analisando 1.284 fontes...</span><h3>O faturamento cresceu 18,4% no período.</h3><p>O crescimento foi impulsionado principalmente pelas regiões Sul e Sudeste, com destaque para a linha Enterprise.</p><div className="source-tags"><span>Relatório Q3.pdf</span><span>Vendas.xlsx</span><span>Outlook</span></div></div>
            <div className="data-preview"><BarChart3 /><div className="chart-bars">{[48, 62, 55, 78, 86, 94].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><strong>+18,4%</strong><span>crescimento trimestral</span></div>
          </div>
        </Reveal>
        <div className="file-types">
          {["PDFs", "Word", "Excel", "PowerPoint", "E-mails", "Bancos de dados", "Documentos internos"].map((type) => <span key={type}><FileSearch />{type}</span>)}
        </div>
      </section>

      <section className="section security-section" id="seguranca">
        <div className="security-layout">
          <Reveal>
            <span className="eyebrow"><LockKeyhole size={16} /> Segurança empresarial</span>
            <h2>Seu conhecimento protegido em cada camada.</h2>
            <p>Controles projetados para que cada pessoa acesse somente o que precisa, mantendo os dados da empresa seguros.</p>
          </Reveal>
          <div className="security-grid">
            {[
              [ShieldCheck, "LGPD", "Privacidade e controle sobre os dados"],
              [LockKeyhole, "Criptografia", "Proteção durante trânsito e armazenamento"],
              [Users, "Controle de acesso", "Papéis e permissões por usuário"],
              [Layers3, "Isolamento", "Dados separados por organização"],
            ].map(([Icon, title, text]) => {
              const C = Icon as typeof ShieldCheck;
              return <Reveal className="security-card" key={String(title)}><C /><strong>{String(title)}</strong><p>{String(text)}</p></Reveal>;
            })}
          </div>
        </div>
      </section>

      <section className="section process-section" id="como-funciona">
        <SectionHeading eyebrow="Simples de começar" title="Da conexão ao resultado." text="Uma implantação clara para transformar conhecimento em produtividade." />
        <div className="process-line">
          {[
            ["01", "Conecte seus sistemas", "Integre documentos, ferramentas e fontes de conhecimento."],
            ["02", "A IA aprende", "A SolvitSoft compreende o contexto e a operação da empresa."],
            ["03", "Os agentes trabalham", "Especialistas executam tarefas em cada área do negócio."],
            ["04", "Sua empresa evolui", "Mais velocidade, consistência e produtividade todos os dias."],
          ].map(([number, title, text], index) => (
            <Reveal className="process-step" key={number}>
              <span>{number}</span><h3>{title}</h3><p>{text}</p>{index < 3 && <ArrowRight className="step-arrow" />}
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section metrics-section">
        <div className="metrics-grid">
          {[["95%", "Redução em tarefas repetitivas"], ["80%", "Mais produtividade"], ["24/7", "Agentes trabalhando"], ["Milhares", "de documentos analisados"]].map(([value, label]) => (
            <Reveal className="metric" key={value}><strong>{value}</strong><span>{label}</span></Reveal>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div className="cta-grid" />
        <Reveal className="cta-content">
          <span className="eyebrow light"><Sparkles size={16} /> O futuro do trabalho começa agora</span>
          <h2>Sua empresa está pronta para trabalhar com Inteligência Artificial?</h2>
          <p>Comece hoje mesmo e descubra como a SolvitSoft pode transformar sua operação.</p>
          <button className="cta-button" onClick={goToApp}>Experimentar Agora <ArrowRight /></button>
        </Reveal>
      </section>

      <footer>
        <div className="footer-top">
          <a className="brand" href="#inicio"><span className="brand-mark"><Sparkles size={19} /></span>SolvitSoft</a>
          <p>Inteligência Artificial trabalhando por toda a sua empresa.</p>
          <div className="footer-links"><a href="#agentes">Empresa</a><a href="#integracoes">Recursos</a><a href="mailto:contato@solvitsoft.com.br">Contato</a><a href={APP_URL}>Privacidade</a><a href={APP_URL}>Termos</a></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} SolvitSoft. Todos os direitos reservados.</span><span>Feito no Brasil para empresas do mundo.</span></div>
      </footer>
    </main>
  );
}
