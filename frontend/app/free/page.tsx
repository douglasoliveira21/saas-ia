"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Menu, MessageSquare, Plus, Sparkles, Square, Trash2, X } from "lucide-react";
import { API } from "../lib/api";

type Message={role:"user"|"assistant";content:string;image?:string};
type LocalChat={id:string;title:string;messages:Message[];updatedAt:number};
const DB_NAME="solvitsoft-free-history";
const STORE="chats";

function historyDb(){
  return new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:"id"});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
async function loadHistory(){
  const db=await historyDb();
  return new Promise<LocalChat[]>((resolve,reject)=>{
    const request=db.transaction(STORE,"readonly").objectStore(STORE).getAll();
    request.onsuccess=()=>resolve((request.result as LocalChat[]).sort((a,b)=>b.updatedAt-a.updatedAt));
    request.onerror=()=>reject(request.error);
  });
}
async function saveChat(chat:LocalChat){
  const db=await historyDb();
  return new Promise<void>((resolve,reject)=>{
    const request=db.transaction(STORE,"readwrite").objectStore(STORE).put(chat);
    request.onsuccess=()=>resolve();
    request.onerror=()=>reject(request.error);
  });
}
async function deleteChat(id:string){
  const db=await historyDb();
  return new Promise<void>((resolve,reject)=>{
    const request=db.transaction(STORE,"readwrite").objectStore(STORE).delete(id);
    request.onsuccess=()=>resolve();
    request.onerror=()=>reject(request.error);
  });
}

export default function FreeChat(){
  const [device,setDevice]=useState("");
  const [text,setText]=useState("");
  const [chats,setChats]=useState<LocalChat[]>([]);
  const [selected,setSelected]=useState("");
  const [busy,setBusy]=useState(false);
  const [credits,setCredits]=useState(100);
  const [blocked,setBlocked]=useState(false);
  const [error,setError]=useState("");
  const [menu,setMenu]=useState(false);
  const abortRef=useRef<AbortController|null>(null);
  const active=chats.find(chat=>chat.id===selected);
  const messages=active?.messages||[];

  useEffect(()=>{
    let id=localStorage.getItem("solvitsoft_device_id");
    if(!id){id=crypto.randomUUID()+"-"+crypto.randomUUID();localStorage.setItem("solvitsoft_device_id",id)}
    setDevice(id);
    fetch(API+"/anonymous/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({device_id:id})})
      .then(async response=>{if(!response.ok)throw new Error();return response.json()})
      .then(status=>{setCredits(status.credit_balance);setBlocked(status.blocked);if(status.blocked)setError(status.message||"Seus créditos gratuitos terminaram. Entre ou crie uma conta para continuar.")})
      .catch(()=>setError("Não foi possível consultar o saldo gratuito. Atualize a página e tente novamente."));
    loadHistory().then(items=>{setChats(items);if(items[0])setSelected(items[0].id)}).catch(()=>setError("Não foi possível carregar o histórico deste navegador."));
  },[]);

  function updateLocal(chat:LocalChat){
    setChats(current=>[chat,...current.filter(item=>item.id!==chat.id)].sort((a,b)=>b.updatedAt-a.updatedAt));
    setSelected(chat.id);
    saveChat(chat).catch(()=>setError("Não foi possível salvar esta conversa no navegador."));
  }
  function fresh(){setSelected("");setText("");setError("");setMenu(false)}
  async function remove(id:string){
    await deleteChat(id);
    const remaining=chats.filter(chat=>chat.id!==id);
    setChats(remaining);
    if(selected===id)setSelected(remaining[0]?.id||"");
  }
  function stop(){
    abortRef.current?.abort();
    abortRef.current=null;
    setBusy(false);
  }
  async function send(e:React.FormEvent){
    e.preventDefault();
    if(!text.trim()||busy||!device)return;
    const prompt=text.trim();
    const idempotency_key=crypto.randomUUID();
    const base=active||{id:crypto.randomUUID(),title:prompt.slice(0,55),messages:[],updatedAt:Date.now()};
    const pending={...base,messages:[...base.messages,{role:"user" as const,content:prompt}],updatedAt:Date.now()};
    setText("");
    updateLocal(pending);
    setBusy(true);
    setError("");
    const controller=new AbortController();
    abortRef.current=controller;
    try{
      const response=await fetch(API+"/anonymous/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({device_id:device,message:prompt,idempotency_key}),signal:controller.signal});
      const data=await response.json();
      if(response.status===402){setBlocked(true);throw new Error(data.detail?.message||"Limite gratuito atingido")}
      if(!response.ok)throw new Error(typeof data.detail==="string"?data.detail:"Erro inesperado");
      setCredits(data.credit_balance);
      if(data.credit_balance<=0||data.api_budget_used>=data.api_budget_limit){setBlocked(true);setError("Seu limite gratuito terminou. Entre ou crie uma conta para continuar.")}
      updateLocal({...pending,messages:[...pending.messages,{role:"assistant",content:data.message,image:data.image}],updatedAt:Date.now()});
    }catch(e){
      if((e as Error).name==="AbortError"){
        updateLocal({...pending,messages:[...pending.messages,{role:"assistant",content:"Resposta interrompida pelo usuário."}],updatedAt:Date.now()});
      }else setError((e as Error).message);
    }finally{
      abortRef.current=null;
      setBusy(false);
    }
  }

  return (
    <main className="flex h-screen overflow-hidden bg-white">
      <aside className={`${menu?"flex":"hidden"} fixed inset-y-0 left-0 z-40 w-72 flex-col border-r border-zinc-200 bg-zinc-50 p-3 md:static md:flex`}>
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2 font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-950 text-white"><Sparkles size={17}/></span>SolvitSoft IA</div>
          <button className="md:hidden" onClick={()=>setMenu(false)}><X/></button>
        </div>
        <button onClick={fresh} className="mt-3 flex items-center justify-center gap-2 rounded-xl border bg-white py-3 text-sm font-medium"><Plus size={16}/>Novo bate-papo</button>
        <p className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Histórico neste navegador</p>
        <div className="scroll mt-3 flex-1 space-y-1 overflow-y-auto">
          {chats.map(chat=>(
            <div key={chat.id} className={`group flex items-center rounded-xl ${selected===chat.id?"bg-zinc-200":"hover:bg-zinc-100"}`}>
              <button onClick={()=>{setSelected(chat.id);setMenu(false)}} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm"><MessageSquare size={14}/><span className="truncate">{chat.title}</span></button>
              <button onClick={()=>remove(chat.id)} title="Excluir conversa" className="mr-2 p-1 text-zinc-400 opacity-0 hover:text-red-600 group-hover:opacity-100"><Trash2 size={14}/></button>
            </div>
          ))}
          {!chats.length&&<p className="px-3 py-4 text-xs leading-5 text-zinc-400">Suas conversas gratuitas aparecerão aqui e ficarão salvas somente neste dispositivo.</p>}
        </div>
        <div className="border-t pt-3 text-xs text-zinc-500"><p className={blocked?"font-semibold text-red-600":""}>{blocked?"Limite gratuito encerrado":`${credits} de 100 créditos restantes`}</p><p className="mt-1">{blocked?"Entre ou crie uma conta para continuar":"Plano gratuito neste navegador"}</p></div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-4">
          <button className="rounded-lg border p-2 md:hidden" onClick={()=>setMenu(true)}><Menu size={18}/></button>
          <p className="truncate px-3 text-sm font-medium">{active?.title||"Novo bate-papo"}</p>
          <div className="flex gap-2"><Link href="/login" className="rounded-xl border px-3 py-2 text-sm">Entrar</Link><Link href="/cadastro" className="hidden rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white sm:block">Criar conta</Link></div>
        </header>
        <div className="scroll min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-8">
            {!messages.length?<div className="m-auto w-full text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-zinc-950 text-white"><Sparkles/></span><h1 className="mt-5 text-3xl font-semibold">Como posso ajudar?</h1><p className="mt-2 text-sm text-zinc-500">Use gratuitamente sem cadastro. O histórico fica salvo neste navegador.</p></div>:
            <div className="space-y-6">{messages.map((message,index)=><div key={index} className={message.role==="user"?"ml-auto max-w-[80%] whitespace-pre-wrap rounded-3xl bg-zinc-100 px-5 py-3":"max-w-full"}>{message.image&&<a href={message.image} download="solvitsoft-imagem.png"><img src={message.image} className="mb-3 max-h-[500px] rounded-2xl" alt="Imagem gerada"/></a>}<div className="whitespace-pre-wrap text-sm leading-7">{message.content}</div></div>)}{busy&&<p className="animate-pulse text-sm text-zinc-500">Executando sua solicitação...</p>}</div>}
          </div>
        </div>
        <div className="bg-white px-4 pb-5">
          <form onSubmit={send} className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-white p-3 shadow-xl">
            <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(!busy&&text.trim())e.currentTarget.form?.requestSubmit()}}} placeholder="Envie uma mensagem..." className="min-h-11 flex-1 resize-none bg-transparent p-2 outline-none"/>
            {busy?<button type="button" onClick={stop} title="Interromper resposta" className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-white"><Square size={15} fill="currentColor"/></button>:<button disabled={!text.trim()||blocked} className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-white disabled:bg-zinc-300"><ArrowUp size={18}/></button>}
          </form>
          {error&&<div className="mx-auto mt-3 max-w-3xl rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}{blocked&&<span> — <Link href="/cadastro" className="font-semibold underline">Criar conta</Link></span>}</div>}
        </div>
      </section>
    </main>
  );
}
