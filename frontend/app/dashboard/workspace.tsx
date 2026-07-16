"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API, call, getAccessToken } from "../lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import {
  Bot,
  BrainCircuit,
  ChevronDown,
  Cloud,
  CreditCard,
  Download,
  FileText,
  Folder,
  FolderPlus,
  LayoutDashboard,
  LogOut,
  Monitor,
  Menu,
  Maximize2,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  Settings2,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Users,
  UserRound,
  X,
} from "lucide-react";
type Conversation = {
  id: string;
  title: string;
  folder_id: string | null;
  favorite: boolean;
  created_at: string;
  agent_id: string | null;
};
type ChatMessage = {
  id: string;
  role: string;
  content: string;
  image?: string;
  status?: string;
};
type FolderType = { id: string; name: string };
type AgentType = { id:string; name:string; description:string; permissions?:{builtin?:boolean} };
type Dash = {
  company: { name: string; plan: string };
  counts: Record<string, number>;
  usage: { tokens: number; cost: number };
  limits: { tokens: number };
};
type Me = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  preferred_name?: string | null;
  occupation?: string | null;
  custom_instructions?: string | null;
  location_metadata_enabled?: boolean;
  training_opt_in?: boolean;
  memory_enabled?: boolean;
  company: { id: string; name: string } | null;
};
type Setting = "general" | "account" | "privacy" | "microsoft" | "billing" | "memory";
const input =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-600";
export default function Workspace() {
  const router = useRouter();
  const [data, setData] = useState<Dash | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [agents, setAgents] = useState<AgentType[]>([]);
  const [agentId, setAgentId] = useState("");
  const [selected, setSelected] = useState<string>();
  const [folderId, setFolderId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState("Carregando seu workspace...");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<Setting | null>(null);
  const [profile, setProfile] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [folderName, setFolderName] = useState("");
  const load = useCallback(
    () =>
      Promise.all([
        call("/dashboard"),
        call("/me"),
        call("/conversations"),
        call("/folders"),
        call("/agents"),
      ])
        .then(([d, m, c, f, a]) => {
          setData(d);
          setMe(m);
          setConversations(c);
          setFolders(f);
          setAgents(a);
        })
        .catch(() => router.push("/login"))
        .finally(() => setLoading("")),
    [router],
  );
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLTextAreaElement;
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !e.isComposing &&
        target.tagName === "TEXTAREA" &&
        target.placeholder === "Envie uma mensagem..."
      ) {
        e.preventDefault();
        target.form?.requestSubmit();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  async function open(c: Conversation) {
    setLoading("Abrindo conversa...");
    try {
      setSelected(c.id);
      setCollapsed(false);
      setFolderId(c.folder_id || "");
      setAgentId(c.agent_id || "");
      setMobile(false);
      const history: ChatMessage[] = await call(`/conversations/${c.id}/messages`);
      const token = localStorage.getItem("access_token") || "";
      const hydrated = await Promise.all(
        history.map(async (message) => {
          if (!message.image) return message;
          const response = await fetch(API + message.image, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) return { ...message, image: undefined };
          return { ...message, image: URL.createObjectURL(await response.blob()) };
        }),
      );
      setMessages(hydrated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }
  function fresh() {
    setSelected(undefined);
    setMessages([]);
    setFolderId("");
    setAgentId("");
    setFile(null);
    setMobile(false);
    setCollapsed(true);
  }
  async function patch(id: string, body: object) {
    setLoading("Salvando alteração...");
    try {
      await call(`/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }
  async function remove(id: string) {
    if (!confirm("Excluir esta conversa e todas as mensagens?")) return;
    setLoading("Excluindo conversa...");
    try {
      await call(`/conversations/${id}`, { method: "DELETE" });
      if (selected === id) fresh();
      await load();
    } finally { setLoading(""); }
  }
  async function addFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderName.trim()) return;
    setLoading("Criando pasta...");
    try {
      const f = await call("/folders", {
        method: "POST",
        body: JSON.stringify({ name: folderName, shared: false, permissions: {} }),
      });
      setFolderName("");
      setFolderId(f.id);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(""); }
  }
  async function removeFolder(id:string) {
    if (!confirm("Excluir esta pasta? As conversas voltarão para Recentes.")) return;
    setLoading("Excluindo pasta...");
    try {
      await call(`/folders/${id}`, { method:"DELETE" });
      if (folderId===id) setFolderId("");
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(""); }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setCollapsed(false);
    setError("");
    const prompt = text;
    const aid = crypto.randomUUID();
    try {
      let file_ids: string[] = [];
      if (file) {
        const body = new FormData();
        body.append("file", file);
        const uploaded = await call("/files", { method: "POST", body });
        file_ids = [uploaded.id];
      }
      setText("");
      setFile(null);
      setMessages((v) => [
        ...v,
        { id: crypto.randomUUID(), role: "user", content: prompt },
        { id: aid, role: "assistant", content: "" },
      ]);
      const token = await getAccessToken();
      if (!token) throw new Error("Sua sessão expirou. Entre novamente.");
      const socket = new WebSocket(
        API.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "") +
          `/ws/chat?token=${encodeURIComponent(token)}`,
      );
      socket.onopen = () =>
        socket.send(
          JSON.stringify({
            conversation_id: selected || null,
            folder_id: folderId || null,
            agent_id: agentId || null,
            file_ids,
            message: prompt,
          }),
        );
      socket.onmessage = (e) => {
        const p = JSON.parse(e.data);
        if (p.type === "status")
          setMessages((v) => v.map((m) => m.id === aid ? { ...m, status: p.content } : m));
        if (p.type === "delta")
          setMessages((v) =>
            v.map((m) =>
              m.id === aid ? { ...m, content: m.content + p.content, status: undefined } : m,
            ),
          );
        if (p.type === "done") {
          setSelected(p.conversation_id);
          if (p.image)
            setMessages((v) =>
              v.map((m) => (m.id === aid ? { ...m, image: p.image } : m)),
            );
          socket.close();
          load();
        }
      };
      socket.onerror = () => {
        setError("Falha na conexão em tempo real.");
        setBusy(false);
      };
      socket.onclose = () => setBusy(false);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const favorites = conversations.filter((c) => c.favorite);
  const unfiled = conversations.filter((c) => !c.folder_id && !c.favorite);
  const used = data?.usage.tokens || 0,
    total = data?.limits.tokens || 1,
    left = Math.max(0, total - used),
    pct = Math.min(100, (used / total) * 100);
  const composer = (
    <form
      onSubmit={send}
      className="w-full max-w-3xl rounded-2xl border border-zinc-300 bg-white p-3 shadow-xl"
    >
      <div className="flex items-end gap-2">
        <label className="grid h-10 w-10 cursor-pointer place-items-center rounded-full hover:bg-zinc-100">
          <Paperclip size={19} />
          <input type="file" className="hidden" accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,.md,.html,.png,.jpg,.jpeg,.webp,.mp3,.flac" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Envie uma mensagem..." className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" />
        <button disabled={busy || !text.trim()} className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-white disabled:bg-zinc-300">
          {busy ? <Spinner className="border-zinc-500 border-t-white" /> : <Send size={17} />}
        </button>
      </div>
      {file && <div className="mt-2 flex w-fit gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs"><FileText size={14}/>{file.name}<button type="button" onClick={() => setFile(null)}><X size={13}/></button></div>}
    </form>
  );
  return (
    <main className="flex h-screen overflow-hidden bg-white text-zinc-950">
      {loading && <LoadingOverlay label={loading} />}
      <button
        onClick={() => setMobile(true)}
        className="fixed left-3 top-3 z-30 rounded-lg border bg-white p-2 lg:hidden"
      >
        <Menu size={20} />
      </button>
      <aside
        className={`${mobile ? "flex" : "hidden"} ${collapsed ? "sidebar-collapsed" : ""} fixed inset-y-0 left-0 z-40 w-72 flex-col border-r border-zinc-200 bg-zinc-50 p-3 transition-[width] duration-200 lg:static lg:flex`}
      >
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-950 text-white">
              <Sparkles size={15} />
            </span>
            <span className="sidebar-detail">SolvitSoft IA</span>
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden rounded-lg p-1.5 hover:bg-zinc-200 lg:block" title={collapsed?"Expandir menu":"Recolher menu"}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button>
          <button onClick={() => setMobile(false)} className="lg:hidden">
            <X />
          </button>
        </div>
        <button
          onClick={fresh}
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white py-3 text-sm font-medium shadow-sm"
        >
          <Plus size={16} />
          <span className="sidebar-detail">Novo bate-papo</span>
        </button>
        <button
          onClick={() => setSettings("general")}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-200"
        >
          <Settings2 size={16} />
          <span className="sidebar-detail">Personalizar</span>
        </button>
        <form onSubmit={addFolder} className="sidebar-detail mt-3 flex gap-2">
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Criar pasta"
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none"
          />
          <button className="rounded-lg border border-zinc-200 bg-white px-2">
            <FolderPlus size={15} />
          </button>
        </form>
        <div className="sidebar-detail scroll mt-4 flex-1 space-y-5 overflow-y-auto">
          <DropSection
            title="Favoritos"
            icon={<Star size={13} />}
            items={favorites}
            selected={selected}
            onOpen={open}
            onDrop={(id) => patch(id, { favorite: true })}
            onFavorite={(c) => patch(c.id, { favorite: !c.favorite })}
            onDelete={remove}
          />
          {folders.map((f) => (
            <DropSection
              key={f.id}
              title={f.name}
              icon={<Folder size={13} />}
              items={conversations.filter((c) => c.folder_id === f.id)}
              selected={selected}
              onOpen={open}
              onDrop={(id) => patch(id, { folder_id: f.id })}
              onFavorite={(c) => patch(c.id, { favorite: !c.favorite })}
              onDelete={remove}
              onDeleteFolder={() => removeFolder(f.id)}
            />
          ))}
          <DropSection
            title="Recentes"
            icon={<MessageSquare size={13} />}
            items={unfiled}
            selected={selected}
            onOpen={open}
            onDrop={(id) => patch(id, { folder_id: null, favorite: false })}
            onFavorite={(c) => patch(c.id, { favorite: !c.favorite })}
            onDelete={remove}
          />
        </div>
        <div className="relative border-t border-zinc-200 pt-3">
          <button
            onClick={() => collapsed ? setCollapsed(false) : setProfile(!profile)}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-zinc-200"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
              {me?.name?.[0]?.toUpperCase() || "U"}
            </span>
            <div className="sidebar-detail min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{me?.name}</p>
              <p className="truncate text-xs text-zinc-500">
                Plano {data?.company.plan}
              </p>
            </div>
            <span className="sidebar-detail"><MoreHorizontal size={17} /></span>
          </button>
          {profile && (
            <div className="sidebar-detail absolute bottom-14 left-0 right-0 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
              <button
                onClick={() => { setProfile(false); setSettings("general"); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-zinc-50"
              >
                <Settings2 size={16} />
                Configurações
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  router.push("/login");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-5 pl-14 lg:pl-5">
          <div>
            <p className="max-w-[45vw] truncate text-sm font-medium">
              {conversations.find((c) => c.id === selected)?.title ||
                "Novo bate-papo"}
            </p>
            <p className="text-[11px] text-zinc-400">
              {agents.find((agent)=>agent.id===agentId)?.description || "IA automática para texto, documentos e imagens"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              disabled={!!selected}
              title={selected ? "O especialista fica vinculado a esta conversa" : "Escolha um agente especialista"}
              className="max-w-[190px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs disabled:cursor-not-allowed disabled:bg-zinc-50"
            >
              <option value="">SolvitSoft Automático</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </div>
        </header>
        {error && (
          <div className="mx-auto mt-3 w-full max-w-3xl rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="scroll min-h-0 w-full flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-5 py-8">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-4 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role !== "user" && (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-950 text-white">
                  <Sparkles size={14} />
                </span>
              )}
              <div
                className={`max-w-[84%] text-sm leading-7 ${m.role === "user" ? "whitespace-pre-wrap rounded-3xl bg-zinc-100 px-5 py-3" : "min-w-0 flex-1"}`}
              >
                {m.image && (
                  <button
                    type="button"
                    onClick={() => setPreview(m.image || null)}
                    className="group relative mb-4 block overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50"
                    title="Clique para ampliar"
                  >
                    <img
                      src={m.image}
                      alt="Imagem gerada"
                      className="max-h-[500px] w-auto transition duration-300 group-hover:scale-[1.01]"
                    />
                    <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                      <Maximize2 size={16} />
                    </span>
                  </button>
                )}
                {m.role === "assistant" ? <MarkdownAnswer content={m.content} /> : m.content}
                {m.role === "assistant" && busy && !m.content && (
                  <span className="flex items-center gap-2 text-zinc-400">
                    <Spinner /> {m.status || "Pensando..."}
                  </span>
                )}
              </div>
            </div>
          ))}
          {!messages.length && (
            <div className="m-auto flex w-full flex-col items-center text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-950 text-white">
                <Sparkles />
              </span>
              <h1 className="mt-5 text-3xl font-semibold">
                Bem-vindo, {me?.preferred_name?.trim() || me?.name || "usuário"}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Como o SolvitSoft pode ajudar você hoje?
              </p>
              <div className="mt-8 w-full">{composer}</div>
              <div className="mt-4 flex w-full max-w-xl items-center gap-3 text-xs text-zinc-500">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-zinc-800" style={{width:`${pct}%`}}/></div>
                <span>{pct.toFixed(1).replace(".",",")}% do limite utilizado</span>
              </div>
            </div>
          )}
          </div>
        </div>
        {!!messages.length && <div className="mx-auto mb-5 w-[calc(100%-24px)] max-w-3xl">{composer}</div>}
      </section>
      {preview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-8"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreview(null);
          }}
        >
          <div className="relative flex max-h-full max-w-6xl flex-col items-center">
            <img
              src={preview}
              alt="Visualização ampliada da imagem gerada"
              className="max-h-[calc(100vh-110px)] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <div className="mt-4 flex gap-2">
              <a
                href={preview}
                download="solvitsoft-imagem.png"
                className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 shadow-lg"
              >
                <Download size={17} /> Baixar imagem
              </a>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="flex items-center gap-2 rounded-full border border-white/30 bg-black/40 px-5 py-2.5 text-sm text-white"
              >
                <X size={17} /> Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {settings && (
        <SettingsModal
          tab={settings}
          setTab={setSettings}
          close={() => setSettings(null)}
          data={data}
          used={used}
          left={left}
          pct={pct}
          reload={load}
          me={me}
        />
      )}
    </main>
  );
}
function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950 ${className}`} />;
}
async function downloadAttachment(href: string) {
  const token = await getAccessToken();
  if (!token) throw new Error("Sua sessão expirou. Entre novamente.");
  const path = href.replace(/^\/api\/v1/, "");
  const response = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Não foi possível baixar o arquivo.");
  const disposition = response.headers.get("content-disposition") || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const fallback = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "planilha.xlsx";
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(await response.blob());
  anchor.download = encoded ? decodeURIComponent(encoded) : fallback;
  anchor.click(); URL.revokeObjectURL(anchor.href);
}
function MarkdownAnswer({ content }: { content: string }) {
  return (
    <div className="ai-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          h1: ({ children }) => <h1 className="mb-4 mt-7 text-2xl font-semibold first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-7 text-xl font-semibold first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-6 text-base font-semibold first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>,
          blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-zinc-300 bg-zinc-50 py-2 pl-4 text-zinc-600">{children}</blockquote>,
          a: ({ children, href }) => href?.startsWith("/api/v1/files/") ? <button type="button" onClick={() => downloadAttachment(href)} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 font-medium text-white"><Download size={16}/>{children}</button> : <a href={href} target="_blank" rel="noreferrer" className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800">{children}</a>,
          code: ({ children, className }) => className ? <code className={`${className} block overflow-x-auto rounded-xl bg-zinc-950 p-4 font-mono text-[13px] leading-6 text-zinc-100`}>{children}</code> : <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[13px] text-zinc-900">{children}</code>,
          pre: ({ children }) => <pre className="my-4 overflow-hidden rounded-xl">{children}</pre>,
          table: ({ children }) => <div className="my-5 overflow-x-auto rounded-xl border border-zinc-200"><table className="w-full border-collapse text-left text-sm">{children}</table></div>,
          th: ({ children }) => <th className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-b border-zinc-100 px-4 py-3 align-top last:border-b-0">{children}</td>,
          hr: () => <hr className="my-6 border-zinc-200" />,
          strong: ({ children }) => <strong className="font-semibold text-zinc-950">{children}</strong>,
          em: ({ children }) => <em className="italic text-zinc-700">{children}</em>,
          u: ({ children }) => <u className="decoration-zinc-500 underline-offset-2">{children}</u>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-white/75 backdrop-blur-[2px]" role="status" aria-live="polite">
      <div className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white px-8 py-6 shadow-xl">
        <Spinner className="h-8 w-8" />
        <p className="mt-3 text-sm font-medium text-zinc-700">{label}</p>
      </div>
    </div>
  );
}
function DropSection({
  title,
  icon,
  items,
  selected,
  onOpen,
  onDrop,
  onFavorite,
  onDelete,
  onDeleteFolder,
}: {
  title: string;
  icon: React.ReactNode;
  items: Conversation[];
  selected?: string;
  onOpen: (c: Conversation) => void;
  onDrop: (id: string) => void;
  onFavorite: (c: Conversation) => void;
  onDelete: (id: string) => void;
  onDeleteFolder?: () => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop(e.dataTransfer.getData("conversation"));
      }}
      className={`rounded-xl p-1 ${over ? "bg-blue-50 ring-1 ring-blue-300" : ""}`}
    >
      <div className="mb-1 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {icon}
        {title}
        <span className="ml-auto">{items.length}</span>
        {onDeleteFolder && <button type="button" onClick={onDeleteFolder} className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600" title="Excluir pasta"><Trash2 size={13}/></button>}
      </div>
      {items.map((c) => (
        <div
          key={c.id}
          draggable
          onDragStart={(e) => e.dataTransfer.setData("conversation", c.id)}
          className={`group flex items-center rounded-lg ${selected === c.id ? "bg-zinc-200" : "hover:bg-zinc-100"}`}
        >
          <button
            onClick={() => onOpen(c)}
            className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm text-zinc-700"
          >
            {c.title}
          </button>
          <button
            onClick={() => onFavorite(c)}
            className={`hidden p-1 group-hover:block ${c.favorite ? "text-amber-500" : "text-zinc-400"}`}
          >
            <Star size={14} fill={c.favorite ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => onDelete(c.id)}
            className="hidden p-1 text-zinc-400 hover:text-red-600 group-hover:block"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </section>
  );
}
function SettingsModal({
  tab,
  setTab,
  close,
  data,
  used,
  left,
  pct,
  reload,
  me,
}: {
  tab: Setting;
  setTab: (v: Setting) => void;
  close: () => void;
  data: Dash | null;
  used: number;
  left: number;
  pct: number;
  reload: () => void;
  me: Me | null;
}) {
  const nav: [Setting, string, typeof Bot][] = [
    ["general", "Geral", UserRound],
    ["account", "Conta", Monitor],
    ["privacy", "Privacidade", Shield],
    ["microsoft", "Microsoft 365", Cloud],
    ["billing", "Cobrança", CreditCard],
    ["memory", "Memória", BrainCircuit],
  ];
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-3 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="flex h-[min(760px,94vh)] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <aside className="hidden w-56 border-r border-zinc-200 bg-zinc-50 p-4 md:block">
          <h2 className="px-2 text-lg font-semibold">Configurações</h2>
          <div className="mt-5 space-y-1">
            {nav.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${tab === id ? "bg-zinc-200 font-medium" : "text-zinc-600 hover:bg-zinc-100"}`}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>
        </aside>
        <section className="min-w-0 flex-1 overflow-y-auto p-5 md:p-8">
          <div className="flex items-center justify-between">
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value as Setting)}
              className="rounded-lg border p-2 text-sm md:hidden"
            >
              {nav.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <div />
            <button
              onClick={close}
              className="rounded-full p-2 hover:bg-zinc-100"
            >
              <X size={20} />
            </button>
          </div>
          {tab === "general" && <GeneralSettings me={me} reload={reload} />}
          {tab === "account" && <AccountSettings me={me} />}
          {tab === "privacy" && <PrivacySettings me={me} reload={reload} />}
          {tab === "microsoft" && <MicrosoftSettings />}
          {tab === "billing" && (
            <PlanPanel data={data} used={used} left={left} pct={pct} />
          )}
          {tab === "memory" && <MemorySettings me={me} reload={reload} />}
        </section>
      </div>
    </div>
  );
}
const occupations = ["Administração", "Atendimento ao cliente", "Direito", "Educação", "Engenharia", "Finanças", "Marketing e vendas", "Produto e design", "Programação e TI", "Recursos humanos", "Saúde", "Outro"];
function Toggle({ checked, onChange, disabled=false }: { checked:boolean; onChange:(value:boolean)=>void; disabled?:boolean }) {
  return <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked?"bg-zinc-950":"bg-zinc-300"} disabled:opacity-50`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked?"left-6":"left-1"}`}/></button>;
}
function GeneralSettings({me,reload}:{me:Me|null;reload:()=>void}) {
  const [form,setForm]=useState({name:me?.name||"",preferred_name:me?.preferred_name||"",occupation:me?.occupation||"",custom_instructions:me?.custom_instructions||""});
  const [saving,setSaving]=useState(false); const [avatar,setAvatar]=useState<string>();
  useEffect(()=>{ if(!me?.avatar)return; getAccessToken().then(token=>fetch(API+"/me/avatar",{headers:{Authorization:`Bearer ${token}`}})).then(r=>r.ok?r.blob():null).then(blob=>{if(blob)setAvatar(URL.createObjectURL(blob))}) },[me?.avatar]);
  async function save(e:React.FormEvent){e.preventDefault();setSaving(true);await call("/me",{method:"PATCH",body:JSON.stringify(form)});await reload();setSaving(false)}
  async function upload(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;setSaving(true);const body=new FormData();body.append("file",file);await call("/me/avatar",{method:"POST",body});setAvatar(URL.createObjectURL(file));await reload();setSaving(false)}
  return <form onSubmit={save} className="mx-auto max-w-2xl">
    <h2 className="text-3xl font-semibold">Geral</h2><p className="mt-2 text-sm text-zinc-500">Personalize como o SolvitSoft conversa e trabalha com você.</p>
    <div className="mt-7 flex items-center gap-4"><span className="grid h-20 w-20 overflow-hidden place-items-center rounded-full bg-zinc-900 text-2xl font-semibold text-white">{avatar?<img src={avatar} className="h-full w-full object-cover" alt="Avatar"/>:(form.name[0]||"U").toUpperCase()}</span><label className="cursor-pointer rounded-xl border px-4 py-2 text-sm font-medium">Mudar avatar<input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={upload}/></label></div>
    <div className="mt-7 space-y-5">
      <label className="block text-sm font-medium">Nome completo<input className={`${input} mt-2`} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label className="block text-sm font-medium">Como o SolvitSoft deveria te chamar?<input className={`${input} mt-2`} value={form.preferred_name} onChange={e=>setForm({...form,preferred_name:e.target.value})}/></label>
      <label className="block text-sm font-medium">O que melhor descreve seu trabalho?<select className={`${input} mt-2`} value={form.occupation} onChange={e=>setForm({...form,occupation:e.target.value})}><option value="">Selecione sua área</option>{occupations.map(x=><option key={x}>{x}</option>)}</select><span className="mt-2 block text-xs font-normal text-zinc-500">As respostas usarão exemplos e linguagem mais voltados para esta área.</span></label>
      <label className="block text-sm font-medium">Instruções para o SolvitSoft<textarea rows={6} className={`${input} mt-2 resize-y`} value={form.custom_instructions} onChange={e=>setForm({...form,custom_instructions:e.target.value})}/><span className="mt-2 block text-xs font-normal text-zinc-500">O SolvitSoft levará isso em conta em todos os chats e no Cowork.</span></label>
    </div><button disabled={saving} className="mt-6 flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-50">{saving&&<Spinner className="border-zinc-500 border-t-white"/>}Salvar alterações</button>
  </form>
}
function AccountSettings({me}:{me:Me|null}) {
  const router=useRouter(); const [devices,setDevices]=useState<{id:string;device_name?:string;ip_address?:string;last_used_at?:string}[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{call("/account/devices").then(setDevices).finally(()=>setLoading(false))},[]);
  async function logoutAll(){if(!confirm("Desconectar todos os dispositivos, incluindo este?"))return;await call("/account/logout-all",{method:"POST"});localStorage.clear();router.push("/login")}
  async function remove(){if(!confirm("Esta ação excluirá sua conta e seus dados pessoais. Deseja continuar?"))return;if(prompt('Digite EXCLUIR para confirmar')!=="EXCLUIR")return;await call("/account",{method:"DELETE"});localStorage.clear();router.push("/login")}
  return <div className="mx-auto max-w-2xl"><h2 className="text-3xl font-semibold">Conta</h2>
    <div className="mt-7 rounded-2xl border p-5"><p className="text-sm text-zinc-500">ID da organização</p><p className="mt-2 break-all font-mono text-sm">{me?.company?.id||"—"}</p></div>
    <div className="mt-5 rounded-2xl border"><div className="border-b p-5"><h3 className="font-semibold">Dispositivos confiáveis</h3><p className="mt-1 text-sm text-zinc-500">Todos os dispositivos com uma sessão ativa nesta conta.</p></div>{loading?<PanelLoading/>:devices.map(d=><div key={d.id} className="flex items-center gap-3 border-b p-4 last:border-0"><Monitor size={18}/><div className="flex-1"><p className="text-sm font-medium">{d.device_name||"Dispositivo"}</p><p className="text-xs text-zinc-500">{d.ip_address||"IP não identificado"} · {d.last_used_at?new Date(d.last_used_at).toLocaleString("pt-BR"):""}</p></div></div>)}</div>
    <button onClick={logoutAll} className="mt-5 w-full rounded-xl border px-5 py-3 text-sm font-medium">Desconectar de todos os dispositivos</button>
    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5"><h3 className="font-semibold text-red-800">Excluir conta</h3><p className="mt-1 text-sm text-red-700">Remove seus dados pessoais, conversas, arquivos e acesso à plataforma.</p><button onClick={remove} className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white">Apagar minha conta</button></div>
  </div>
}
function PrivacySettings({me,reload}:{me:Me|null;reload:()=>void}) {
  const [saving,setSaving]=useState(false);
  async function patch(body:object){setSaving(true);await call("/me",{method:"PATCH",body:JSON.stringify(body)});await reload();setSaving(false)}
  async function location(enabled:boolean){if(!enabled){await patch({location_metadata_enabled:false});return}if(!navigator.geolocation){alert("Este navegador não oferece localização.");return}navigator.geolocation.getCurrentPosition(async p=>patch({location_metadata_enabled:true,location_lat:p.coords.latitude,location_lng:p.coords.longitude,location_timezone:Intl.DateTimeFormat().resolvedOptions().timeZone}),e=>alert("Não foi possível obter sua localização: "+e.message),{enableHighAccuracy:false,timeout:10000})}
  return <div className="mx-auto max-w-2xl"><h2 className="text-3xl font-semibold">Privacidade</h2><div className="mt-7 divide-y rounded-2xl border">
    <div className="flex gap-5 p-5"><div className="flex-1"><h3 className="font-medium">Metadados de localização</h3><p className="mt-1 text-sm leading-6 text-zinc-500">Permite usar sua localização aproximada para respostas locais, clima e recomendações. Ao desabilitar, os dados armazenados são apagados.</p></div><Toggle checked={!!me?.location_metadata_enabled} onChange={location} disabled={saving}/></div>
    <div className="flex gap-5 p-5"><div className="flex-1"><h3 className="font-medium">Ajude a melhorar nossos modelos de IA</h3><p className="mt-1 text-sm leading-6 text-zinc-500">Permitir o uso de suas conversas e sessões de programação para treinar e melhorar os modelos de IA da SolvitSoft.</p></div><Toggle checked={!!me?.training_opt_in} onChange={v=>patch({training_opt_in:v})} disabled={saving}/></div>
  </div></div>
}
function MemorySettings({me,reload}:{me:Me|null;reload:()=>void}) {
  const [saving,setSaving]=useState(false); async function toggle(value:boolean){setSaving(true);await call("/me",{method:"PATCH",body:JSON.stringify({memory_enabled:value})});await reload();setSaving(false)}
  return <div className="mx-auto max-w-2xl"><h2 className="text-3xl font-semibold">Memória</h2><div className="mt-7 flex gap-5 rounded-2xl border p-5"><div className="flex-1"><h3 className="font-medium">Gerar memória do histórico de conversas</h3><p className="mt-1 text-sm leading-6 text-zinc-500">Permitir que o SolvitSoft se lembre do contexto relevante dos seus chats. Esta configuração controla a memória tanto para chats quanto para projetos.</p></div><Toggle checked={me?.memory_enabled!==false} onChange={toggle} disabled={saving}/></div><div className="mt-6"><MemoryPanel/></div></div>
}
function MicrosoftSettings() {
  const [state,setState]=useState<{connected:boolean;email?:string}>({connected:false}); const [loading,setLoading]=useState(true);
  const load=()=>call("/microsoft/status").then(setState).finally(()=>setLoading(false));
  useEffect(()=>{load()},[]);
  async function connect(){const data=await call("/microsoft/connect");location.href=data.url}
  async function disconnect(){if(!confirm("Desconectar a conta Microsoft 365?"))return;await call("/microsoft",{method:"DELETE"});load()}
  return <div className="mx-auto max-w-2xl"><h2 className="text-3xl font-semibold">Microsoft 365</h2><p className="mt-2 text-sm text-zinc-500">Conecte Word, Excel, Outlook, PowerPoint, OneDrive, calendário e contatos à sua IA SolvitSoft.</p><div className="mt-7 rounded-2xl border p-6">{loading?<PanelLoading/>:<><div className="flex items-center gap-3"><Cloud/><div><p className="font-semibold">{state.connected?"Conta conectada":"Nenhuma conta conectada"}</p>{state.email&&<p className="text-sm text-zinc-500">{state.email}</p>}</div></div><button onClick={state.connected?disconnect:connect} className={`mt-6 rounded-xl px-5 py-3 text-sm font-medium ${state.connected?"border":"bg-zinc-950 text-white"}`}>{state.connected?"Desconectar Microsoft 365":"Entrar com Microsoft 365"}</button></>}</div></div>
}
function PlanPanel({
  data,
  used,
  left,
  pct,
}: {
  data: Dash | null;
  used: number;
  left: number;
  pct: number;
}) {
  async function upgrade() {
    try {
      const x = await call("/billing/checkout?plan=professional", {
        method: "POST",
      });
      location.href = x.url;
    } catch (e) {
      alert((e as Error).message);
    }
  }
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Visão geral
      </p>
      <h2 className="mt-2 text-3xl font-semibold">Plano e consumo</h2>
      <div className="mt-7 rounded-2xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">Plano atual</p>
            <p className="mt-1 text-2xl font-semibold capitalize">
              {data?.company.plan}
            </p>
          </div>
          <button
            onClick={upgrade}
            className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white"
          >
            Fazer upgrade
          </button>
        </div>
        <div className="mt-8">
          <div className="flex justify-between text-sm">
            <span>{used.toLocaleString("pt-BR")} tokens usados</span>
            <span className="text-zinc-500">
              {left.toLocaleString("pt-BR")} restantes
            </span>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-950"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            Limite do plano:{" "}
            {(data?.limits.tokens || 0).toLocaleString("pt-BR")} tokens
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["Usuários", data?.counts.users],
          ["Conversas", data?.counts.conversations],
          ["Agentes", data?.counts.agents],
          ["Arquivos", data?.counts.files],
        ].map(([a, b]) => (
          <div key={a as string} className="rounded-xl border p-4">
            <p className="text-xs text-zinc-500">{a}</p>
            <p className="mt-2 text-xl font-semibold">{b || 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
function AgentPanel({ reload }: { reload: () => void }) {
  const [items, setItems] = useState<
    { id: string; name: string; description: string }[]
  >([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => { setLoading(true); return call("/agents").then(setItems).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await call("/agents", {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        ai_model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
        system_prompt: `Você é ${name}. ${description}`,
        temperature: 0.7,
        permissions: {},
      }),
    });
    setName("");
    setDescription("");
    await load();
    reload();
    setSaving(false);
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold">Agentes</h2>
      <p className="mt-2 text-sm text-zinc-500">
        Crie especialistas. O roteador continua escolhendo a IA automaticamente.
      </p>
      <form
        onSubmit={add}
        className="mt-6 grid gap-3 rounded-2xl border p-5 sm:grid-cols-2"
      >
        <input
          className={input}
          placeholder="Nome do agente"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className={input}
          placeholder="Especialidade"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-zinc-950 py-3 text-sm text-white disabled:bg-zinc-400 sm:col-span-2">
          {saving && <Spinner className="border-zinc-500 border-t-white" />} Criar agente
        </button>
      </form>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {loading && <PanelLoading />}
        {items.map((a) => (
          <div key={a.id} className="rounded-xl border p-4">
            <p className="font-medium">{a.name}</p>
            <p className="mt-1 text-sm text-zinc-500">{a.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
function MemoryPanel() {
  const [items, setItems] = useState<{ id: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); return call("/memories").then(setItems).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function del(id: string) {
    await call(`/memories/${id}`, { method: "DELETE" });
    load();
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold">Memória pessoal</h2>
      <p className="mt-2 text-sm text-zinc-500">
        Preferências usadas em futuras conversas. Só você pode visualizá-las.
      </p>
      <div className="mt-6 overflow-hidden rounded-2xl border">
        {loading && <PanelLoading />}
        {items.map((m) => (
          <div key={m.id} className="flex gap-3 border-b p-4 last:border-0">
            <BrainCircuit size={17} />
            <p className="flex-1 text-sm">{m.value}</p>
            <button onClick={() => del(m.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {!loading && !items.length && (
          <p className="p-10 text-center text-sm text-zinc-400">
            Nenhuma memória registrada.
          </p>
        )}
      </div>
    </div>
  );
}
function TeamPanel() {
  const [items, setItems] = useState<
    { id: string; name: string; email: string; role: string }[]
  >([]);
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => { setLoading(true); return call("/team").then(setItems).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const x = await call("/team/invite", {
      method: "POST",
      body: JSON.stringify({ email, role: "member" }),
    });
    setLink(x.invite_url);
    setEmail("");
    setSaving(false);
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold">Equipe</h2>
      <form onSubmit={invite} className="mt-6 flex gap-2">
        <input
          className={input}
          type="email"
          placeholder="email@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm text-white disabled:bg-zinc-400">
          {saving && <Spinner className="border-zinc-500 border-t-white" />} Convidar
        </button>
      </form>
      {link && (
        <p className="mt-3 break-all rounded-xl bg-zinc-50 p-3 text-xs">
          {link}
        </p>
      )}
      <div className="mt-5 overflow-hidden rounded-2xl border">
        {loading && <PanelLoading />}
        {items.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 border-b p-4 last:border-0"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100">
              {m.name[0]}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{m.name}</p>
              <p className="text-xs text-zinc-500">{m.email}</p>
            </div>
            <span className="text-xs capitalize text-zinc-500">{m.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function FilesPanel({ reload }: { reload: () => void }) {
  const [items, setItems] = useState<
    { id: string; name: string; size: number; index_status: string; index_error?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => { setLoading(true); return call("/files").then(setItems).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!items.some((item) => ["pending", "processing"].includes(item.index_status))) return;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [items, load]);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setSaving(true);
    const body = new FormData();
    body.append("file", f);
    await call("/files", { method: "POST", body });
    await load();
    reload();
    setSaving(false);
  }
  async function reindex(id: string) {
    await call(`/files/${id}/reindex`, { method: "POST" });
    await load();
  }
  const statusLabel: Record<string, string> = { pending: "Na fila", processing: "Indexando", ready: "Pronto para IA", failed: "Falhou", unsupported: "Sem indexação" };
  return (
    <div>
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Arquivos</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Documentos disponíveis no seu workspace.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white">
          {saving ? <Spinner className="border-zinc-500 border-t-white" /> : <Upload size={16} />}
          {saving ? "Enviando..." : "Enviar"}
          <input type="file" className="hidden" onChange={upload} />
        </label>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border">
        {loading && <PanelLoading />}
        {items.map((f) => (
          <div key={f.id} className="flex items-center gap-3 border-b p-4 last:border-0">
            <FileText size={18} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm">{f.name}</p><p className={`mt-1 text-xs ${f.index_status === "failed" ? "text-red-600" : f.index_status === "ready" ? "text-emerald-600" : "text-zinc-400"}`} title={f.index_error}>{statusLabel[f.index_status] || f.index_status}</p></div>
            <span className="text-xs text-zinc-400">
              {(f.size / 1024).toFixed(1)} KB
            </span>
            {["failed", "ready"].includes(f.index_status) && <button type="button" onClick={() => reindex(f.id)} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50">Reindexar</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
function PanelLoading() {
  return <div className="col-span-full flex items-center justify-center gap-3 p-10 text-sm text-zinc-500"><Spinner /> Carregando...</div>;
}
