import asyncio, pathlib, secrets
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File as Upload, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.orm import Session
import httpx, stripe
from app.config import settings
from app.database import get_db, SessionLocal
from app.models import Company, User, RefreshToken, Invitation, Agent, Folder, Conversation, Message, File, UsageLog
from app.schemas import Register, Login, Refresh, AgentIn, InviteIn, AcceptInvite, FolderIn, ChatIn
from app.security import hash_password, verify_password, create_token, random_token, token_hash, current_user, require_roles
from jose import jwt, JWTError

app=FastAPI(title=settings.app_name,version="1.0.0",docs_url="/docs")
app.add_middleware(CORSMiddleware,allow_origins=[settings.frontend_url,"http://localhost:3000"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
API="/api/v1"
PLANS={"starter":{"tokens":500000,"users":5,"agents":3},"professional":{"tokens":3000000,"users":25,"agents":15},"enterprise":{"tokens":20000000,"users":250,"agents":100}}
def refresh_pair(user,db):
    raw=random_token(); db.add(RefreshToken(user_id=user.id,token_hash=token_hash(raw),expires_at=datetime.now(timezone.utc)+timedelta(days=30))); db.commit(); return {"access_token":create_token(user),"refresh_token":raw,"token_type":"bearer"}
def dump(obj): return {c.name:getattr(obj,c.name) for c in obj.__table__.columns}
def tenant_get(db,model,obj_id,user):
    obj=db.scalar(select(model).where(model.id==obj_id,model.company_id==user.company_id))
    if not obj: raise HTTPException(404,"Registro não encontrado")
    return obj
@app.get("/health")
def health(): return {"status":"ok","service":settings.app_name}
@app.post(API+"/auth/register",status_code=201)
def register(data:Register,db:Session=Depends(get_db)):
    if db.scalar(select(User).where(User.email==data.email)): raise HTTPException(409,"E-mail já cadastrado")
    company=Company(name=data.company_name,document=data.document,email=data.email); db.add(company); db.flush()
    user=User(company_id=company.id,name=data.name,email=data.email,password_hash=hash_password(data.password),role="owner"); db.add(user); db.commit(); return refresh_pair(user,db)
@app.post(API+"/auth/login")
def login(data:Login,db:Session=Depends(get_db)):
    user=db.scalar(select(User).where(User.email==data.email))
    if not user or not verify_password(data.password,user.password_hash): raise HTTPException(401,"Credenciais inválidas")
    return refresh_pair(user,db)
@app.post(API+"/auth/refresh")
def refresh(data:Refresh,db:Session=Depends(get_db)):
    item=db.scalar(select(RefreshToken).where(RefreshToken.token_hash==token_hash(data.refresh_token),RefreshToken.revoked==False))
    if not item or item.expires_at.replace(tzinfo=timezone.utc)<datetime.now(timezone.utc): raise HTTPException(401,"Refresh token inválido")
    item.revoked=True; user=db.get(User,item.user_id); db.commit(); return refresh_pair(user,db)
@app.get(API+"/me")
def me(user=Depends(current_user),db:Session=Depends(get_db)): return {**dump(user),"company":dump(db.get(Company,user.company_id))}
@app.get(API+"/dashboard")
def dashboard(user=Depends(current_user),db:Session=Depends(get_db)):
    cid=user.company_id; company=db.get(Company,cid); usage=db.execute(select(func.coalesce(func.sum(UsageLog.input_tokens+UsageLog.output_tokens),0),func.coalesce(func.sum(UsageLog.cost),0)).where(UsageLog.company_id==cid)).one()
    counts={k:db.scalar(select(func.count()).select_from(m).where(m.company_id==cid)) for k,m in {"users":User,"agents":Agent,"conversations":Conversation,"files":File}.items()}
    return {"company":dump(company),"counts":counts,"usage":{"tokens":usage[0],"cost":round(usage[1],4)},"limits":PLANS.get(company.plan,PLANS["starter"])}
@app.get(API+"/team")
def team(user=Depends(require_roles("owner","admin")),db:Session=Depends(get_db)): return [dump(x) for x in db.scalars(select(User).where(User.company_id==user.company_id)).all()]
@app.post(API+"/team/invite")
def invite(data:InviteIn,user=Depends(require_roles("owner","admin")),db:Session=Depends(get_db)):
    if data.role not in ("admin","member"): raise HTTPException(400,"Perfil inválido")
    token=random_token(); item=Invitation(company_id=user.company_id,email=data.email,role=data.role,token=token,expires_at=datetime.now(timezone.utc)+timedelta(days=7)); db.add(item); db.commit()
    return {"message":"Convite criado","invite_url":f"{settings.frontend_url}/convite?token={token}","email_delivery":"configure SMTP para envio automático" if not settings.smtp_host else "queued"}
@app.post(API+"/team/accept")
def accept(data:AcceptInvite,db:Session=Depends(get_db)):
    inv=db.scalar(select(Invitation).where(Invitation.token==data.token,Invitation.accepted==False))
    if not inv or inv.expires_at.replace(tzinfo=timezone.utc)<datetime.now(timezone.utc): raise HTTPException(400,"Convite inválido ou expirado")
    if db.scalar(select(User).where(User.email==inv.email)): raise HTTPException(409,"E-mail já cadastrado")
    user=User(company_id=inv.company_id,name=data.name,email=inv.email,password_hash=hash_password(data.password),role=inv.role); inv.accepted=True; db.add(user); db.commit(); return refresh_pair(user,db)
@app.get(API+"/agents")
def agents(user=Depends(current_user),db:Session=Depends(get_db)): return [dump(x) for x in db.scalars(select(Agent).where(Agent.company_id==user.company_id).order_by(Agent.created_at.desc())).all()]
@app.post(API+"/agents",status_code=201)
def create_agent(data:AgentIn,user=Depends(require_roles("owner","admin")),db:Session=Depends(get_db)):
    company=db.get(Company,user.company_id); count=db.scalar(select(func.count()).select_from(Agent).where(Agent.company_id==user.company_id))
    if count>=PLANS.get(company.plan,PLANS["starter"])["agents"]: raise HTTPException(402,"Limite de agentes do plano atingido")
    item=Agent(company_id=user.company_id,created_by=user.id,**data.model_dump()); db.add(item); db.commit(); db.refresh(item); return dump(item)
@app.delete(API+"/agents/{item_id}",status_code=204)
def delete_agent(item_id:str,user=Depends(require_roles("owner","admin")),db:Session=Depends(get_db)): db.delete(tenant_get(db,Agent,item_id,user)); db.commit()
@app.get(API+"/folders")
def folders(user=Depends(current_user),db:Session=Depends(get_db)): return [dump(x) for x in db.scalars(select(Folder).where(Folder.company_id==user.company_id)).all()]
@app.post(API+"/folders",status_code=201)
def create_folder(data:FolderIn,user=Depends(current_user),db:Session=Depends(get_db)): item=Folder(company_id=user.company_id,created_by=user.id,**data.model_dump()); db.add(item); db.commit(); db.refresh(item); return dump(item)
@app.get(API+"/conversations")
def conversations(user=Depends(current_user),db:Session=Depends(get_db)): return [dump(x) for x in db.scalars(select(Conversation).where(Conversation.company_id==user.company_id,Conversation.user_id==user.id).order_by(Conversation.created_at.desc())).all()]
@app.get(API+"/conversations/{item_id}/messages")
def messages(item_id:str,user=Depends(current_user),db:Session=Depends(get_db)): tenant_get(db,Conversation,item_id,user); return [dump(x) for x in db.scalars(select(Message).where(Message.conversation_id==item_id).order_by(Message.created_at)).all()]
@app.post(API+"/files",status_code=201)
async def upload(file:UploadFile=Upload(...),user=Depends(current_user),db:Session=Depends(get_db)):
    allowed={"application/pdf","text/plain","text/markdown","image/png","image/jpeg"}
    if file.content_type not in allowed: raise HTTPException(400,"Tipo de arquivo não permitido")
    content=await file.read()
    if len(content)>20*1024*1024: raise HTTPException(413,"Arquivo excede 20 MB")
    root=pathlib.Path("storage")/user.company_id; root.mkdir(parents=True,exist_ok=True); safe=f"{secrets.token_hex(12)}-{pathlib.Path(file.filename or 'file').name}"; path=root/safe; path.write_bytes(content)
    item=File(company_id=user.company_id,user_id=user.id,name=file.filename or safe,path=str(path),mime_type=file.content_type or "application/octet-stream",size=len(content)); db.add(item); db.commit(); db.refresh(item); return dump(item)
async def ai_answer(data:ChatIn,user,db):
    conv=tenant_get(db,Conversation,data.conversation_id,user) if data.conversation_id else Conversation(company_id=user.company_id,user_id=user.id,agent_id=data.agent_id,title=data.message[:70])
    if not data.conversation_id: db.add(conv); db.flush()
    agent=tenant_get(db,Agent,data.agent_id,user) if data.agent_id else None; model=agent.ai_model if agent else settings.default_ai_model; prompt=agent.system_prompt if agent else "Você é um assistente empresarial claro e útil."
    db.add(Message(conversation_id=conv.id,role="user",content=data.message)); history=db.scalars(select(Message).where(Message.conversation_id==conv.id).order_by(Message.created_at.desc()).limit(20)).all()
    if settings.deepinfra_api_key:
        payload={"model":model,"messages":[{"role":"system","content":prompt}]+[{"role":m.role,"content":m.content} for m in reversed(history)],"temperature":agent.temperature if agent else .7}
        async with httpx.AsyncClient(timeout=120) as client:
            res=await client.post(f"{settings.deepinfra_base_url}/chat/completions",json=payload,headers={"Authorization":f"Bearer {settings.deepinfra_api_key}"}); res.raise_for_status(); result=res.json()
        answer=result["choices"][0]["message"]["content"]; usage=result.get("usage",{}); inp=usage.get("prompt_tokens",0); out=usage.get("completion_tokens",0)
    else: answer="A integração de IA está pronta. Configure DEEPINFRA_API_KEY no ambiente para receber respostas reais."; inp=len(data.message)//4; out=len(answer)//4
    db.add(Message(conversation_id=conv.id,role="assistant",content=answer,tokens=out)); db.add(UsageLog(company_id=user.company_id,user_id=user.id,model=model,input_tokens=inp,output_tokens=out,cost=(inp*.0000005+out*.0000008))); db.commit()
    return {"conversation_id":conv.id,"message":answer,"model":model,"usage":{"input":inp,"output":out}}
@app.post(API+"/chat")
async def chat(data:ChatIn,user=Depends(current_user),db:Session=Depends(get_db)): return await ai_answer(data,user,db)
@app.websocket("/ws/chat")
async def chat_stream(ws:WebSocket):
    token=ws.query_params.get("token","")
    try: user_id=jwt.decode(token,settings.secret_key,algorithms=["HS256"])["sub"]
    except (JWTError,KeyError): await ws.close(code=4401); return
    await ws.accept(); db=SessionLocal()
    try:
        user=db.get(User,user_id)
        if not user or user.status!="active": await ws.close(code=4401); return
        while True:
            payload=await ws.receive_json(); result=await ai_answer(ChatIn.model_validate(payload),user,db)
            words=result["message"].split(" ")
            for word in words: await ws.send_json({"type":"delta","content":word+" "}); await asyncio.sleep(.01)
            await ws.send_json({"type":"done","conversation_id":result["conversation_id"],"model":result["model"],"usage":result["usage"]})
    except WebSocketDisconnect: pass
    finally: db.close()
@app.post(API+"/billing/checkout")
def checkout(plan:str,user=Depends(require_roles("owner")),db:Session=Depends(get_db)):
    if not settings.stripe_secret_key: raise HTTPException(503,"Stripe ainda não configurado")
    prices={"starter":settings.stripe_starter_price_id,"professional":settings.stripe_professional_price_id,"enterprise":settings.stripe_enterprise_price_id}; price=prices.get(plan)
    if not price: raise HTTPException(400,"Plano ou Price ID inválido")
    stripe.api_key=settings.stripe_secret_key; company=db.get(Company,user.company_id)
    session=stripe.checkout.Session.create(mode="subscription",line_items=[{"price":price,"quantity":1}],success_url=settings.frontend_url+"/dashboard?billing=success",cancel_url=settings.frontend_url+"/planos",customer=company.stripe_customer_id or None,customer_email=None if company.stripe_customer_id else company.email,metadata={"company_id":company.id,"plan":plan}); return {"url":session.url}
@app.post(API+"/billing/webhook")
async def webhook(request:Request,db:Session=Depends(get_db)):
    payload=await request.body(); sig=request.headers.get("stripe-signature","")
    try: event=stripe.Webhook.construct_event(payload,sig,settings.stripe_webhook_secret)
    except Exception: raise HTTPException(400,"Webhook inválido")
    obj=event["data"]["object"]; cid=(obj.get("metadata") or {}).get("company_id")
    if cid:
        company=db.get(Company,cid)
        if company:
            company.stripe_customer_id=obj.get("customer") or company.stripe_customer_id; company.stripe_subscription_id=obj.get("subscription") or obj.get("id") or company.stripe_subscription_id
            if event["type"]=="customer.subscription.deleted": company.status="canceled"
            elif event["type"]=="invoice.payment_failed": company.status="past_due"
            else: company.status="active"; company.plan=(obj.get("metadata") or {}).get("plan",company.plan)
            db.commit()
    return {"received":True}
@app.get(API+"/admin/companies")
def admin_companies(user=Depends(require_roles("superadmin")),db:Session=Depends(get_db)): return [dump(x) for x in db.scalars(select(Company).order_by(Company.created_at.desc())).all()]
