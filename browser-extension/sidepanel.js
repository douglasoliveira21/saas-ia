const API="https://api.solvitsoft.com.br/api/v1";
const $=(id)=>document.getElementById(id);
const escapeHtml=(value)=>value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function markdown(value){
  let html=escapeHtml(value);
  html=html.replace(/```(?:\w+)?\n([\s\S]*?)```/g,"<pre><code>$1</code></pre>")
    .replace(/^### (.+)$/gm,"<h3>$1</h3>").replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/(^|[^\*])\*([^\n*]+)\*/g,"$1<em>$2</em>")
    .replace(/`([^`\n]+)`/g,"<code>$1</code>").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^&gt; (.+)$/gm,"<blockquote>$1</blockquote>").replace(/^- (.+)$/gm,"<li>$1</li>");
  html=html.replace(/((?:<li>.*?<\/li>\n?)+)/g,"<ul>$1</ul>").replace(/\n{2,}/g,"</p><p>").replace(/\n/g,"<br>");
  return `<p>${html}</p>`.replace(/<p>\s*(<(?:h[1-3]|pre|ul|blockquote)>)/g,"$1").replace(/(<\/(?:h[1-3]|pre|ul|blockquote)>)\s*<\/p>/g,"$1");
}
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
  if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error((typeof error.detail==="object"?error.detail?.message:error.detail)||"Erro na API")}return response.status===204?null:response.json();
}
async function activeTab(){
  const allowed=await chrome.permissions.request({origins:["http://*/*","https://*/*"]});
  if(!allowed)throw new Error("Autorize o acesso aos sites para que a extensão possa ler a página.");
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id)throw new Error("Nenhuma aba ativa foi encontrada.");
  return tab;
}
async function activeContext(){
  const tab=await activeTab();
  try {
    const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>({title:document.title,url:location.href,selection:String(getSelection()||""),text:(document.body?.innerText||"").slice(0,40000)})});
    return result.result;
  } catch {
    throw new Error("Esta página é protegida pelo navegador. Abra um site comum com endereço http ou https.");
  }
}
async function screenshotFile(){
  const tab=await activeTab();
  const result=await chrome.runtime.sendMessage({type:"capture",windowId:tab.windowId});if(result.error)throw new Error(result.error);
  const blob=await (await fetch(result.dataUrl)).blob();const body=new FormData();body.append("file",blob,"pagina.png");const tokens=await stored();
  let response=await fetch(API+"/files",{method:"POST",headers:{Authorization:`Bearer ${tokens.access_token}`},body});if(response.status===401){const token=await refresh();response=await fetch(API+"/files",{method:"POST",headers:{Authorization:`Bearer ${token}`},body})}
  if(!response.ok)throw new Error("Não foi possível enviar a captura.");return (await response.json()).id;
}
async function boot(){const tokens=await stored();$("login").hidden=!!tokens.access_token;$("app").hidden=!tokens.access_token}
$("loginButton").onclick=async()=>{try{const response=await fetch(API+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("email").value,password:$("password").value})});if(!response.ok)throw new Error((await response.json()).detail||"Login inválido");await chrome.storage.local.set(await response.json());boot()}catch(error){$("loginError").textContent=error.message}};
$("send").onclick=async()=>{try{$("send").disabled=true;$("status").textContent="Lendo a página e consultando a IA...";let context={};if($("pageContext").checked)context=await activeContext();const file_ids=$("screenshot").checked?[await screenshotFile()]:[];const message=`[BROWSER_CONTEXT]\nPágina atual: ${context.title||""}\nURL: ${context.url||""}\nTexto selecionado: ${context.selection||""}\nConteúdo visível:\n${context.text||""}\n\nSolicitação: ${$("prompt").value}`;const result=await api("/chat",{method:"POST",body:JSON.stringify({message,file_ids,idempotency_key:crypto.randomUUID()})});$("empty").hidden=true;$("answer").hidden=false;$("answer").innerHTML=markdown(result.message);$("actions").hidden=false;$("status").textContent="Concluído."}catch(error){$("status").textContent=error.message}finally{$("send").disabled=false}};
$("insert").onclick=async()=>{try{const value=$("answer").textContent;if(!value)throw new Error("Ainda não existe uma resposta para inserir.");const tab=await activeTab();const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},args:[value],func:(text)=>{const element=document.activeElement;if(!element)return false;if(element instanceof HTMLInputElement||element instanceof HTMLTextAreaElement){const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element),"value")?.set;setter?.call(element,text);element.dispatchEvent(new Event("input",{bubbles:true}));element.dispatchEvent(new Event("change",{bubbles:true}));return true}if(element.isContentEditable){element.textContent=text;element.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:text}));return true}return false}});if(!result.result)throw new Error("Clique primeiro no campo da página onde deseja inserir.");$("status").textContent="Resposta inserida no campo selecionado."}catch(error){$("status").textContent=error.message}};
$("copy").onclick=async()=>{const value=$("answer").textContent;if(value){await navigator.clipboard.writeText(value);$("status").textContent="Resposta copiada."}};
$("logout").onclick=async()=>{await chrome.storage.local.clear();boot()};boot();
