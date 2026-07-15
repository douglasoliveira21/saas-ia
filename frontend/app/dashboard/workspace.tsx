"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API, call } from "../lib/api";
import {
  Bot,
  BrainCircuit,
  ChevronDown,
  CreditCard,
  FileText,
  Folder,
  FolderPlus,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Send,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
type Conversation = {
  id: string;
  title: string;
  folder_id: string | null;
  favorite: boolean;
  created_at: string;
};
type ChatMessage = {
  id: string;
  role: string;
  content: string;
  image?: string;
};
type FolderType = { id: string; name: string };
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
  company: { name: string } | null;
};
type Setting = "overview" | "agents" | "files" | "team" | "memory";
const input =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-600";
export default function Workspace() {
  const router = useRouter();
  const [data, setData] = useState<Dash | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selected, setSelected] = useState<string>();
  const [folderId, setFolderId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<Setting | null>(null);
  const [profile, setProfile] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [folderName, setFolderName] = useState("");
  const load = useCallback(
    () =>
      Promise.all([
        call("/dashboard"),
        call("/me"),
        call("/conversations"),
        call("/folders"),
      ])
        .then(([d, m, c, f]) => {
          setData(d);
          setMe(m);
          setConversations(c);
          setFolders(f);
        })
        .catch(() => router.push("/login")),
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
    setSelected(c.id);
    setFolderId(c.folder_id || "");
    setMobile(false);
    setMessages(await call(`/conversations/${c.id}/messages`));
  }
  function fresh() {
    setSelected(undefined);
    setMessages([]);
    setFolderId("");
    setFile(null);
    setMobile(false);
  }
  async function patch(id: string, body: object) {
    try {
      await call(`/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove(id: string) {
    if (!confirm("Excluir esta conversa e todas as mensagens?")) return;
    await call(`/conversations/${id}`, { method: "DELETE" });
    if (selected === id) fresh();
    load();
  }
  async function addFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderName.trim()) return;
    const f = await call("/folders", {
      method: "POST",
      body: JSON.stringify({
        name: folderName,
        shared: false,
        permissions: {},
      }),
    });
    setFolderName("");
    setFolderId(f.id);
    load();
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
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
      const token = localStorage.getItem("access_token") || "";
      const socket = new WebSocket(
        API.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "") +
          `/ws/chat?token=${encodeURIComponent(token)}`,
      );
      socket.onopen = () =>
        socket.send(
          JSON.stringify({
            conversation_id: selected || null,
            folder_id: folderId || null,
            file_ids,
            message: prompt,
          }),
        );
      socket.onmessage = (e) => {
        const p = JSON.parse(e.data);
        if (p.type === "delta")
          setMessages((v) =>
            v.map((m) =>
              m.id === aid ? { ...m, content: m.content + p.content } : m,
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
  return (
    <main className="flex h-screen overflow-hidden bg-white text-zinc-950">
      <button
        onClick={() => setMobile(true)}
        className="fixed left-3 top-3 z-30 rounded-lg border bg-white p-2 lg:hidden"
      >
        <Menu size={20} />
      </button>
      <aside
        className={`${mobile ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-72 flex-col border-r border-zinc-200 bg-zinc-50 p-3 lg:static lg:flex`}
      >
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-950 text-white">
              <Sparkles size={15} />
            </span>
            SolvitSoft IA
          </div>
          <button onClick={() => setMobile(false)} className="lg:hidden">
            <X />
          </button>
        </div>
        <button
          onClick={fresh}
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white py-3 text-sm font-medium shadow-sm"
        >
          <Plus size={16} />
          Novo bate-papo
        </button>
        <button
          onClick={() => setSettings("overview")}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-200"
        >
          <Settings2 size={16} />
          Personalizar
        </button>
        <form onSubmit={addFolder} className="mt-3 flex gap-2">
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
        <div className="scroll mt-4 flex-1 space-y-5 overflow-y-auto">
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
            onClick={() => setProfile(!profile)}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-zinc-200"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
              {me?.name?.[0]?.toUpperCase() || "U"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{me?.name}</p>
              <p className="truncate text-xs text-zinc-500">
                Plano {data?.company.plan}
              </p>
            </div>
            <MoreHorizontal size={17} />
          </button>
          {profile && (
            <div className="absolute bottom-14 left-0 right-0 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
              <button
                onClick={() => setSettings("overview")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-zinc-50"
              >
                <CreditCard size={16} />
                Plano e uso
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
              IA automática para texto, documentos e imagens
            </p>
          </div>
          {selected && (
            <select
              value={folderId}
              onChange={(e) => {
                setFolderId(e.target.value);
                patch(selected, { folder_id: e.target.value || null });
              }}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs"
            >
              <option value="">Sem pasta</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </header>
        {error && (
          <div className="mx-auto mt-3 w-full max-w-3xl rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="scroll mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-y-auto px-5 py-8">
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
                className={`max-w-[84%] whitespace-pre-wrap text-sm leading-7 ${m.role === "user" ? "rounded-3xl bg-zinc-100 px-5 py-3" : ""}`}
              >
                {m.image && (
                  <img
                    src={m.image}
                    alt="Imagem gerada"
                    className="mb-4 max-h-[500px] rounded-2xl"
                  />
                )}
                {m.content}
                {m.role === "assistant" && busy && !m.content && (
                  <span className="animate-pulse text-zinc-400">
                    Pensando...
                  </span>
                )}
              </div>
            </div>
          ))}
          {!messages.length && (
            <div className="m-auto text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-950 text-white">
                <Sparkles />
              </span>
              <h1 className="mt-5 text-2xl font-semibold">
                Como posso ajudar?
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Pergunte, anexe um arquivo ou peça uma imagem.
              </p>
            </div>
          )}
        </div>
        <form
          onSubmit={send}
          className="mx-auto mb-5 w-[calc(100%-24px)] max-w-3xl rounded-2xl border border-zinc-300 bg-white p-3 shadow-xl"
        >
          <div className="flex items-end gap-2">
            <label className="grid h-10 w-10 cursor-pointer place-items-center rounded-full hover:bg-zinc-100">
              <Paperclip size={19} />
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,.md,.html,.png,.jpg,.jpeg,.webp,.mp3,.flac"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Envie uma mensagem..."
              className="min-h-10 flex-1 resize-none px-2 py-2 text-sm outline-none"
            />
            <button
              disabled={busy || !text.trim()}
              className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-white disabled:bg-zinc-300"
            >
              <Send size={17} />
            </button>
          </div>
          {file && (
            <div className="mt-2 flex w-fit gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs">
              <FileText size={14} />
              {file.name}
              <button type="button" onClick={() => setFile(null)}>
                <X size={13} />
              </button>
            </div>
          )}
        </form>
      </section>
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
        />
      )}
    </main>
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
}: {
  title: string;
  icon: React.ReactNode;
  items: Conversation[];
  selected?: string;
  onOpen: (c: Conversation) => void;
  onDrop: (id: string) => void;
  onFavorite: (c: Conversation) => void;
  onDelete: (id: string) => void;
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
}: {
  tab: Setting;
  setTab: (v: Setting) => void;
  close: () => void;
  data: Dash | null;
  used: number;
  left: number;
  pct: number;
  reload: () => void;
}) {
  const nav: [Setting, string, typeof Bot][] = [
    ["overview", "Visão geral", LayoutDashboard],
    ["agents", "Agentes", Bot],
    ["memory", "Memória", BrainCircuit],
    ["team", "Equipe", Users],
    ["files", "Arquivos", FileText],
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
          <h2 className="px-2 text-lg font-semibold">Personalizar</h2>
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
          {tab === "overview" && (
            <PlanPanel data={data} used={used} left={left} pct={pct} />
          )}{" "}
          {tab === "agents" && <AgentPanel reload={reload} />}{" "}
          {tab === "memory" && <MemoryPanel />}{" "}
          {tab === "team" && <TeamPanel />}{" "}
          {tab === "files" && <FilesPanel reload={reload} />}
        </section>
      </div>
    </div>
  );
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
  const load = useCallback(() => call("/agents").then(setItems), []);
  useEffect(() => {
    load();
  }, [load]);
  async function add(e: React.FormEvent) {
    e.preventDefault();
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
    load();
    reload();
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
        <button className="rounded-xl bg-zinc-950 py-3 text-sm text-white sm:col-span-2">
          Criar agente
        </button>
      </form>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
  const load = useCallback(() => call("/memories").then(setItems), []);
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
        {items.map((m) => (
          <div key={m.id} className="flex gap-3 border-b p-4 last:border-0">
            <BrainCircuit size={17} />
            <p className="flex-1 text-sm">{m.value}</p>
            <button onClick={() => del(m.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {!items.length && (
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
  const load = useCallback(() => call("/team").then(setItems), []);
  useEffect(() => {
    load();
  }, [load]);
  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const x = await call("/team/invite", {
      method: "POST",
      body: JSON.stringify({ email, role: "member" }),
    });
    setLink(x.invite_url);
    setEmail("");
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
        <button className="rounded-xl bg-zinc-950 px-5 text-sm text-white">
          Convidar
        </button>
      </form>
      {link && (
        <p className="mt-3 break-all rounded-xl bg-zinc-50 p-3 text-xs">
          {link}
        </p>
      )}
      <div className="mt-5 overflow-hidden rounded-2xl border">
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
    { id: string; name: string; size: number }[]
  >([]);
  const load = useCallback(() => call("/files").then(setItems), []);
  useEffect(() => {
    load();
  }, [load]);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const body = new FormData();
    body.append("file", f);
    await call("/files", { method: "POST", body });
    load();
    reload();
  }
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
          <Upload size={16} />
          Enviar
          <input type="file" className="hidden" onChange={upload} />
        </label>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border">
        {items.map((f) => (
          <div key={f.id} className="flex gap-3 border-b p-4 last:border-0">
            <FileText size={18} />
            <p className="flex-1 truncate text-sm">{f.name}</p>
            <span className="text-xs text-zinc-400">
              {(f.size / 1024).toFixed(1)} KB
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
