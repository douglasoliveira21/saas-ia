const API="https://api.solvitsoft.com.br/api/v1";
const $=(id)=>document.getElementById(id);
async function stored(){return chrome.storage.local.get(["access_token","refresh_token"])}
async function refresh(){
  const tokens=await stored(); if(!tokens.refresh_token)return null;
  const response=await fetch(API+"/auth/refresh",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh_token:tokens.refresh_token})});
  if(!response.ok){await chrome.storage.local.clear();return null}
  const next=await response.json();await chrome.storage.local.set(next);return next.access_token;
}
async function api(path,options={}){
  let tokens=await stored();let response=await fetch(API+path,{...options,headers:{"Content-Type":"application/json",Authorization:`Bearer ${tokens.access_token||""}`,...options.headers}});
  if(response.status===401){const token=await refresh();if(!token)throw new Error("Sessão expirada");response=await fetch(API+path,{...options,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,...options.headers}})}
  if(!response.ok)throw new Error((await response.json().catch(()=>({}))).detail||"Erro na API");return response.status===204?null:response.json();
}
async function activeContext(){
  const allowed=await chrome.permissions.request({origins:["http://*/*","https://*/*"]});
  if(!allowed)throw new Error("Autorize o acesso aos sites para que a extensão possa ler a página.");
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id)throw new Error("Nenhuma aba ativa foi encontrada.");
  try {
    const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>({title:document.title,url:location.href,selection:String(getSelection()||""),text:(document.body?.innerText||"").slice(0,40000)})});
    return result.result;
  } catch {
    throw new Error("Esta página é protegida pelo navegador. Abra um site comum com endereço http ou https.");
  }
}
async function screenshotFile(){
  const result=await chrome.runtime.sendMessage({type:"capture"});if(result.error)throw new Error(result.error);
  const blob=await (await fetch(result.dataUrl)).blob();const body=new FormData();body.append("file",blob,"pagina.png");const tokens=await stored();
  let response=await fetch(API+"/files",{method:"POST",headers:{Authorization:`Bearer ${tokens.access_token}`},body});if(response.status===401){const token=await refresh();response=await fetch(API+"/files",{method:"POST",headers:{Authorization:`Bearer ${token}`},body})}
  if(!response.ok)throw new Error("Não foi possível enviar a captura.");return (await response.json()).id;
}
async function boot(){const tokens=await stored();$("login").hidden=!!tokens.access_token;$("app").hidden=!tokens.access_token}
$("loginButton").onclick=async()=>{try{const response=await fetch(API+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("email").value,password:$("password").value})});if(!response.ok)throw new Error((await response.json()).detail||"Login inválido");await chrome.storage.local.set(await response.json());boot()}catch(error){$("loginError").textContent=error.message}};
$("send").onclick=async()=>{try{$("status").textContent="Lendo a página e consultando a IA...";let context={};if($("pageContext").checked)context=await activeContext();const file_ids=$("screenshot").checked?[await screenshotFile()]:[];const message=`Página atual: ${context.title||""}\nURL: ${context.url||""}\nTexto selecionado: ${context.selection||""}\nConteúdo visível:\n${context.text||""}\n\nSolicitação: ${$("prompt").value}`;const result=await api("/chat",{method:"POST",body:JSON.stringify({message,file_ids})});$("answer").textContent=result.message;$("status").textContent="Concluído."}catch(error){$("status").textContent=error.message}};
$("logout").onclick=async()=>{await chrome.storage.local.clear();boot()};boot();
