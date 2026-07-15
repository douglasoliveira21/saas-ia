export const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000/api/v1";
export async function call(path:string,options:RequestInit={}){const token=typeof window!=="undefined"?localStorage.getItem("access_token"):null;const r=await fetch(API+path,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{ }),...options.headers}});if(!r.ok){const e=await r.json().catch(()=>({detail:"Erro inesperado"}));throw new Error(e.detail||"Erro inesperado")}return r.status===204?null:r.json()}

