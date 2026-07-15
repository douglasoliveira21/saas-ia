"use client";
import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {Bot,Files,LayoutDashboard,LogOut,MessageSquare,Plus,Send,Sparkles,Trash2,Upload,Users} from "lucide-react";
import {call} from "../lib/api";

type Tab="overview"|"conversations"|"agents"|"files"|"team";
type Dash={company:{name:string;plan:string};counts:Record<string,number>;usage:{tokens:number;cost:number};limits:{tokens:number};is_superadmin?:boolean};
type Conversation={id:string;title:string;created_at:string};
type ChatMessage={id:string;role:string;content:string};
type Agent={id:string;name:string;description:string;ai_model:string;system_prompt:string};
type StoredFile={id:string;name:string;mime_type:string;size:number;created_at:string};
type Member={id:string;name:string;email:string;role:string;status:string};

const field="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm outline-none focus:border-lime";
const button="rounded-xl bg-lime px-5 py-3 text-sm font-semibold text-ink disabled:opacity-50";

export default function Dashboard(){
  const router=useRouter();
  const [tab,setTab]=useState<Tab>("overview");
  const [data,setData]=useState<Dash|null>(null);
  const [error,setError]=useState("");
  const refresh=useCallback(()=>call("/dashboard").then(setData).catch(()=>router.push("/login")),[router]);
  useEffect(()=>{refresh()},[refresh]);
  const nav:[Tab,string,typeof Bot][]=[["overview","Visão geral",LayoutDashboard],["conversations","Conversas",MessageSquare],["agents","Agentes",Bot],["files","Arquivos",Files],["team","Equipe",Users]];
  return <main className="flex min-h-screen bg-ink">
    <aside className="hidden w-64 shrink-0 border-r border-line p-5 md:flex md:flex-col">
      <div className="flex items-center gap-2 text-lg font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-lime text-ink"><Sparkles size={17}/></span>SolvitSoft IA</div>
      <div className="mt-10 space-y-2 text-sm">{nav.map(([id,label,Icon])=><button key={id} onClick={()=>{setError("");setTab(id)}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 ${tab===id?"bg-lime/10 text-lime":"text-zinc-400 hover:bg-panel"}`}><Icon size={18}/>{label}</button>)}</div>
      <button onClick={()=>{localStorage.clear();router.push("/login")}} className="mt-auto flex items-center gap-3 px-3 py-3 text-sm text-zinc-500"><LogOut size={17}/>Sair</button>
    </aside>
    <section className="min-w-0 flex-1 p-5 md:p-9">
      <header className="flex items-center justify-between"><div><p className="text-sm text-zinc-500">Workspace</p><h1 className="mt-1 text-2xl font-semibold">{data?.company.name||"Carregando..."}</h1></div><span className="rounded-full border border-lime/20 bg-lime/10 px-4 py-2 text-xs uppercase text-lime">Plano {data?.company.plan||"starter"}</span></header>
      <div className="mt-5 flex gap-2 overflow-x-auto md:hidden">{nav.map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${tab===id?"bg-lime text-ink":"bg-panel text-zinc-400"}`}>{label}</button>)}</div>
      {error&&<div className="mt-5 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">{error}</div>}
      {tab==="overview"&&<Overview data={data}/>}
      {tab==="conversations"&&<Conversations onError={setError} onChange={refresh}/>}
      {tab==="agents"&&<Agents onError={setError} onChange={refresh}/>}
      {tab==="files"&&<FileManager onError={setError} onChange={refresh}/>}
      {tab==="team"&&<Team onError={setError} onChange={refresh}/>}
    </section>
  </main>
}

function Overview({data}:{data:Dash|null}){
  const cards:[string,number,typeof Bot][]=[["Usuários",data?.counts.users||0,Users],["Conversas",data?.counts.conversations||0,MessageSquare],["Agentes",data?.counts.agents||0,Bot],["Arquivos",data?.counts.files||0,Files]];
  return <><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon])=><div key={label} className="glass rounded-2xl p-5"><div className="flex items-center justify-between text-sm text-zinc-500"><span>{label}</span><Icon size={18}/></div><div className="mt-5 text-3xl font-semibold">{value}</div></div>)}</div><div className="glass mt-5 rounded-2xl p-6"><h2 className="font-semibold">Uso do plano</h2><div className="mt-6 flex justify-between text-sm"><span className="text-zinc-500">Tokens consumidos</span><span>{(data?.usage.tokens||0).toLocaleString("pt-BR")} / {(data?.limits.tokens||0).toLocaleString("pt-BR")}</span></div><div className="mt-3 h-2 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-lime" style={{width:`${Math.min(100,((data?.usage.tokens||0)/(data?.limits.tokens||1))*100)}%`}}/></div><p className="mt-6 text-sm text-zinc-500">Custo estimado: <span className="text-white">US$ {(data?.usage.cost||0).toFixed(4)}</span></p></div></>
}

function Conversations({onError,onChange}:{onError:(v:string)=>void;onChange:()=>void}){
  const [items,setItems]=useState<Conversation[]>([]);const [agents,setAgents]=useState<Agent[]>([]);const [agentId,setAgentId]=useState("");const [selected,setSelected]=useState<string>();const [messages,setMessages]=useState<ChatMessage[]>([]);const [text,setText]=useState("");const [busy,setBusy]=useState(false);
  const load=useCallback(()=>call("/conversations").then(setItems).catch((e:Error)=>onError(e.message)),[onError]);
  useEffect(()=>{load();call("/agents").then(setAgents).catch(()=>undefined)},[load]);
  async function open(id:string){setSelected(id);setAgentId("");try{setMessages(await call(`/conversations/${id}/messages`))}catch(e){onError((e as Error).message)}}
  async function send(e:React.FormEvent){e.preventDefault();if(!text.trim())return;setBusy(true);onError("");try{const userText=text;setText("");setMessages(v=>[...v,{id:crypto.randomUUID(),role:"user",content:userText}]);const result=await call("/chat",{method:"POST",body:JSON.stringify({conversation_id:selected||null,agent_id:agentId||null,message:userText})});setSelected(result.conversation_id);setMessages(v=>[...v,{id:crypto.randomUUID(),role:"assistant",content:result.message}]);load();onChange()}catch(e){onError((e as Error).message)}finally{setBusy(false)}}
  return <div className="mt-8 grid min-h-[620px] gap-5 lg:grid-cols-[300px_1fr]"><aside className="glass rounded-2xl p-4"><button onClick={()=>{setSelected(undefined);setMessages([]);setAgentId("")}} className={`${button} flex w-full items-center justify-center gap-2`}><Plus size={16}/>Nova conversa</button><div className="mt-4 space-y-2">{items.map(x=><button key={x.id} onClick={()=>open(x.id)} className={`w-full rounded-xl p-3 text-left text-sm ${selected===x.id?"bg-lime/10 text-lime":"bg-ink text-zinc-400"}`}><span className="block truncate">{x.title}</span></button>)}{!items.length&&<p className="p-4 text-center text-sm text-zinc-600">Nenhuma conversa</p>}</div></aside><section className="glass flex min-h-[620px] flex-col rounded-2xl p-5"><div className="mb-4 flex items-center gap-3 border-b border-line pb-4"><Bot size={18} className="text-lime"/><select className="rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none" value={agentId} onChange={e=>setAgentId(e.target.value)} disabled={!!selected}><option value="">Assistente padrão</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>{selected&&<span className="text-xs text-zinc-600">O agente é definido ao iniciar a conversa</span>}</div><div className="flex-1 space-y-4 overflow-y-auto">{messages.map(m=><div key={m.id} className={`max-w-[85%] rounded-2xl p-4 text-sm leading-6 ${m.role==="user"?"ml-auto bg-lime text-ink":"bg-ink text-zinc-300"}`}>{m.content}</div>)}{!messages.length&&<div className="grid h-full place-items-center text-center text-zinc-600"><div><MessageSquare className="mx-auto mb-3"/><p>Inicie uma conversa com a IA</p></div></div>}</div><form onSubmit={send} className="mt-5 flex gap-3"><input className={field} value={text} onChange={e=>setText(e.target.value)} placeholder="Digite sua mensagem..."/><button disabled={busy} className="grid w-12 shrink-0 place-items-center rounded-xl bg-lime text-ink"><Send size={18}/></button></form></section></div>
}

function Agents({onError,onChange}:{onError:(v:string)=>void;onChange:()=>void}){
  const [items,setItems]=useState<Agent[]>([]);const [show,setShow]=useState(false);const [form,setForm]=useState({name:"",description:"",ai_model:"meta-llama/Meta-Llama-3.1-70B-Instruct",system_prompt:"Você é um assistente empresarial útil.",temperature:.7,permissions:{}});
  const load=useCallback(()=>call("/agents").then(setItems).catch((e:Error)=>onError(e.message)),[onError]);useEffect(()=>{load()},[load]);
  async function create(e:React.FormEvent){e.preventDefault();try{await call("/agents",{method:"POST",body:JSON.stringify(form)});setShow(false);setForm({...form,name:"",description:""});load();onChange()}catch(e){onError((e as Error).message)}}
  async function remove(id:string){if(!confirm("Excluir este agente?"))return;try{await call(`/agents/${id}`,{method:"DELETE"});load();onChange()}catch(e){onError((e as Error).message)}}
  return <div className="mt-8"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Agentes personalizados</h2><p className="mt-1 text-sm text-zinc-500">Especialistas com modelo e instruções próprias.</p></div><button onClick={()=>setShow(!show)} className={`${button} flex items-center gap-2`}><Plus size={16}/>Novo agente</button></div>{show&&<form onSubmit={create} className="glass mt-5 grid gap-4 rounded-2xl p-6 md:grid-cols-2"><input className={field} placeholder="Nome do agente" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/><input className={field} placeholder="Descrição" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><input className={`${field} md:col-span-2`} placeholder="Identificador do modelo" value={form.ai_model} onChange={e=>setForm({...form,ai_model:e.target.value})} required/><textarea className={`${field} min-h-28 md:col-span-2`} value={form.system_prompt} onChange={e=>setForm({...form,system_prompt:e.target.value})}/><button className={`${button} md:col-span-2`}>Criar agente</button></form>}<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(x=><article key={x.id} className="glass rounded-2xl p-6"><div className="flex justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-lime/10 text-lime"><Bot/></span><button onClick={()=>remove(x.id)} className="text-zinc-600 hover:text-red-400"><Trash2 size={18}/></button></div><h3 className="mt-5 font-semibold">{x.name}</h3><p className="mt-2 min-h-10 text-sm text-zinc-500">{x.description||"Sem descrição"}</p><p className="mt-4 truncate rounded-lg bg-ink p-2 text-xs text-zinc-500">{x.ai_model}</p></article>)}{!items.length&&<p className="text-sm text-zinc-600">Nenhum agente criado.</p>}</div></div>
}

function FileManager({onError,onChange}:{onError:(v:string)=>void;onChange:()=>void}){
  const [items,setItems]=useState<StoredFile[]>([]);const [busy,setBusy]=useState(false);const load=useCallback(()=>call("/files").then(setItems).catch((e:Error)=>onError(e.message)),[onError]);useEffect(()=>{load()},[load]);
  async function upload(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;setBusy(true);const body=new FormData();body.append("file",file);try{await call("/files",{method:"POST",body});load();onChange()}catch(e){onError((e as Error).message)}finally{setBusy(false);e.target.value=""}}
  async function remove(id:string){if(!confirm("Excluir este arquivo?"))return;try{await call(`/files/${id}`,{method:"DELETE"});load();onChange()}catch(e){onError((e as Error).message)}}
  return <div className="mt-8"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Arquivos</h2><p className="mt-1 text-sm text-zinc-500">PDF, texto, Markdown, PNG ou JPEG — até 20 MB.</p></div><label className={`${button} flex cursor-pointer items-center gap-2`}><Upload size={16}/>{busy?"Enviando...":"Enviar arquivo"}<input className="hidden" type="file" accept=".pdf,.txt,.md,.png,.jpg,.jpeg" onChange={upload} disabled={busy}/></label></div><div className="glass mt-6 overflow-hidden rounded-2xl"><div className="grid grid-cols-[1fr_120px_50px] border-b border-line p-4 text-xs uppercase text-zinc-600"><span>Arquivo</span><span>Tamanho</span><span/></div>{items.map(x=><div key={x.id} className="grid grid-cols-[1fr_120px_50px] items-center border-b border-line/60 p-4 last:border-0"><div className="min-w-0"><p className="truncate text-sm">{x.name}</p><p className="mt-1 text-xs text-zinc-600">{x.mime_type}</p></div><span className="text-sm text-zinc-500">{(x.size/1024).toFixed(1)} KB</span><button onClick={()=>remove(x.id)} className="text-zinc-600 hover:text-red-400"><Trash2 size={17}/></button></div>)}{!items.length&&<p className="p-10 text-center text-sm text-zinc-600">Nenhum arquivo enviado.</p>}</div></div>
}

function Team({onError,onChange}:{onError:(v:string)=>void;onChange:()=>void}){
  const [items,setItems]=useState<Member[]>([]);const [email,setEmail]=useState("");const [role,setRole]=useState("member");const [invite,setInvite]=useState("");const load=useCallback(()=>call("/team").then(setItems).catch((e:Error)=>onError(e.message)),[onError]);useEffect(()=>{load()},[load]);
  async function send(e:React.FormEvent){e.preventDefault();try{const x=await call("/team/invite",{method:"POST",body:JSON.stringify({email,role})});setInvite(x.invite_url);setEmail("");onChange()}catch(e){onError((e as Error).message)}}
  return <div className="mt-8"><h2 className="text-xl font-semibold">Equipe</h2><p className="mt-1 text-sm text-zinc-500">Convide administradores e membros para sua empresa.</p><form onSubmit={send} className="glass mt-6 flex flex-col gap-3 rounded-2xl p-5 md:flex-row"><input className={field} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@empresa.com" required/><select className={`${field} md:w-44`} value={role} onChange={e=>setRole(e.target.value)}><option value="member">Membro</option><option value="admin">Administrador</option></select><button className={`${button} whitespace-nowrap`}>Enviar convite</button></form>{invite&&<div className="mt-4 rounded-xl border border-lime/20 bg-lime/10 p-4 text-sm"><p className="text-lime">Convite criado. Copie e envie este link:</p><p className="mt-2 break-all text-zinc-300">{invite}</p></div>}<div className="glass mt-6 overflow-hidden rounded-2xl">{items.map(x=><div key={x.id} className="flex items-center gap-4 border-b border-line p-4 last:border-0"><span className="grid h-10 w-10 place-items-center rounded-full bg-zinc-800 text-sm font-semibold">{x.name.slice(0,1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm">{x.name}</p><p className="truncate text-xs text-zinc-600">{x.email}</p></div><span className="rounded-full bg-zinc-800 px-3 py-1 text-xs capitalize text-zinc-400">{x.role}</span><span className="hidden text-xs text-lime sm:block">{x.status}</span></div>)}{!items.length&&<p className="p-10 text-center text-sm text-zinc-600">Nenhum membro encontrado.</p>}</div></div>
}
