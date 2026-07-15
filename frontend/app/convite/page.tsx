"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {call} from "../lib/api";

export default function Convite(){
  const router=useRouter();const [token,setToken]=useState("");const [name,setName]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");
  useEffect(()=>setToken(new URLSearchParams(window.location.search).get("token")||""),[]);
  async function accept(e:React.FormEvent){e.preventDefault();try{const x=await call("/team/accept",{method:"POST",body:JSON.stringify({token,name,password})});localStorage.setItem("access_token",x.access_token);localStorage.setItem("refresh_token",x.refresh_token);router.push("/dashboard")}catch(e){setError((e as Error).message)}}
  return <main className="grid-bg flex min-h-screen items-center justify-center p-6"><form onSubmit={accept} className="glass w-full max-w-md rounded-3xl p-8"><p className="text-sm text-lime">CONVITE DE EQUIPE</p><h1 className="mt-3 text-3xl font-semibold">Entre no workspace</h1><p className="mt-2 text-sm text-zinc-500">Defina seu nome e uma senha para aceitar o convite.</p>{error&&<p className="mt-5 rounded-xl bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}<label className="mt-7 block text-sm">Seu nome<input className="mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3 outline-none focus:border-lime" value={name} onChange={e=>setName(e.target.value)} required/></label><label className="mt-4 block text-sm">Senha<input type="password" minLength={8} className="mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3 outline-none focus:border-lime" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button disabled={!token} className="mt-6 w-full rounded-xl bg-lime py-3 font-semibold text-ink disabled:opacity-40">Aceitar convite</button>{!token&&<p className="mt-4 text-sm text-red-400">Link de convite inválido.</p>}</form></main>
}
