"use client";
import Link from "next/link";
import {useState} from "react";
import {call} from "../lib/api";
export default function ForgotPassword(){
  const [email,setEmail]=useState(""); const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{const data=await call("/auth/password/forgot",{method:"POST",body:JSON.stringify({email})});setMessage(data.message)}catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar o link")}finally{setBusy(false)}}
  return <main className="flex min-h-screen items-center justify-center bg-white p-6"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-zinc-200 p-8 shadow-xl"><h1 className="text-3xl font-semibold">Recuperar senha</h1><p className="mt-3 text-zinc-500">Informe seu e-mail. O link enviado será válido por 15 minutos e poderá ser usado uma única vez.</p>{message&&<p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{error&&<p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<label className="mt-6 block text-sm font-medium">E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-600"/></label><button disabled={busy||!!message} className="mt-6 w-full rounded-xl bg-zinc-950 py-3 font-medium text-white disabled:opacity-50">{busy?"Enviando...":"Enviar link seguro"}</button><Link href="/login" className="mt-5 block text-center text-sm font-medium text-zinc-600">Voltar ao login</Link></form></main>
}
