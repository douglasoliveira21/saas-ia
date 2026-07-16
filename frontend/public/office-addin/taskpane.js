const API = "https://api.solvitsoft.com.br/api/v1";
let lastAnswer = "";
const status = (value) => document.getElementById("status").textContent = value;
function selectedText() {
  return new Promise((resolve, reject) => Office.context.document.getSelectedDataAsync(
    Office.CoercionType.Text,
    (result) => result.status === Office.AsyncResultStatus.Succeeded ? resolve(String(result.value || "")) : reject(result.error),
  ));
}
async function currentContext() {
  if (Office.context.host === Office.HostType.Word) return Word.run(async (context) => { const body=context.document.body; body.load("text"); await context.sync(); return body.text; });
  if (Office.context.host === Office.HostType.Excel) return Excel.run(async (context) => { const range=context.workbook.getActiveWorksheet().getUsedRange(); range.load("values"); await context.sync(); return JSON.stringify(range.values); });
  if (Office.context.host === Office.HostType.Outlook) return new Promise((resolve) => Office.context.mailbox.item.body.getAsync("text", (result) => resolve(result.value || "")));
  return selectedText();
}
async function insert(value) {
  if (Office.context.host === Office.HostType.Word) return Word.run(async (context) => { context.document.getSelection().insertText(value, Word.InsertLocation.replace); await context.sync(); });
  if (Office.context.host === Office.HostType.Excel) return Excel.run(async (context) => { context.workbook.getSelectedRange().values=[[value]]; await context.sync(); });
  if (Office.context.host === Office.HostType.Outlook) return new Promise((resolve) => Office.context.mailbox.item.body.setSelectedDataAsync(value, { coercionType:"text" }, resolve));
  return new Promise((resolve) => Office.context.document.setSelectedDataAsync(value, { coercionType:Office.CoercionType.Text }, resolve));
}
Office.onReady(() => {
  document.getElementById("ask").onclick = async () => {
    try {
      status("Lendo conteúdo e consultando a SolvitSoft...");
      const token=localStorage.getItem("access_token");
      if (!token) { window.open("https://app.solvitsoft.com.br/login","_blank"); throw new Error("Entre na SolvitSoft e abra novamente o painel."); }
      const source=await currentContext();
      const prompt=document.getElementById("prompt").value;
      const response=await fetch(API+"/chat",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({message:`Contexto do Microsoft ${Office.context.host}:\n${source.slice(0,25000)}\n\nSolicitação: ${prompt}`,file_ids:[]})});
      if (!response.ok) throw new Error((await response.json()).detail || "Falha na API");
      lastAnswer=(await response.json()).message;
      document.getElementById("answer").textContent=lastAnswer; status("Resposta concluída.");
    } catch (error) { status(error.message); }
  };
  document.getElementById("insert").onclick=async()=>{ if(lastAnswer){await insert(lastAnswer);status("Conteúdo inserido.")} };
});
