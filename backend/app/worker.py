from celery import Celery
import httpx
import shutil
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from redis import Redis
from app.config import settings
from app.database import SessionLocal
from app.models import AIUsageReservation, AIUsageLedger, AnonymousAllowance, Company, StripeWebhookEvent, SystemAlert, User
from app.rag import index_file
celery=Celery("nexora",broker=settings.redis_url,backend=settings.redis_url)
PLAN_CREDITS={"free":100,"starter":700,"professional":1600,"premium":3000,"enterprise":7000}
celery.conf.update(
    timezone="America/Sao_Paulo",
    beat_schedule={
        "worker-heartbeat":{"task":"app.worker.worker_heartbeat","schedule":30.0},
        "reconcile-stale-ai-reservations":{"task":"app.worker.reconcile_stale_reservations","schedule":300.0},
        "monitor-operational-health":{"task":"app.worker.monitor_operational_health","schedule":60.0},
    },
)
@celery.task(bind=True,autoretry_for=(ConnectionError,httpx.HTTPError),retry_backoff=True,retry_kwargs={"max_retries":3})
def process_document(self,file_id:str): return index_file(file_id)

def append_event(db,item,status,error_code=None,final_credits=0):
    db.add(AIUsageLedger(
        company_id=item.company_id,user_id=item.user_id,anonymous_device_hash=item.anonymous_device_hash,provider=item.provider,model=item.model,
        provider_request_id=item.provider_request_id,operation=item.operation,estimated_cost=item.estimated_cost,actual_cost=item.actual_cost,
        reserved_credits=item.reserved_credits,final_credits=final_credits,status=status,latency_ms=max(0,int((datetime.now(timezone.utc)-item.created_at.replace(tzinfo=timezone.utc)).total_seconds()*1000)),
        error_code=error_code,reservation_id=item.id,idempotency_key=item.idempotency_key,
    ))

def create_alert(db,kind,severity,message,details):
    reservation_id=details.get("reservation_id")
    existing=next((item for item in db.scalars(select(SystemAlert).where(SystemAlert.kind==kind,SystemAlert.status=="open").limit(500)).all() if (item.details or {}).get("reservation_id")==reservation_id),None) if reservation_id else None
    if not existing: db.add(SystemAlert(kind=kind,severity=severity,status="open",message=message,details=details))

@celery.task(name="app.worker.worker_heartbeat")
def worker_heartbeat():
    client=Redis.from_url(settings.redis_url,decode_responses=True)
    now_value=datetime.now(timezone.utc).isoformat()
    client.set("monitor:worker:heartbeat",now_value,ex=120)
    return now_value

@celery.task(name="app.worker.monitor_operational_health")
def monitor_operational_health():
    db=SessionLocal(); now_value=datetime.now(timezone.utc); created=[]
    try:
        stale_cutoff=now_value-timedelta(minutes=max(5,settings.reservation_stale_minutes))
        stale=len(db.scalars(select(AIUsageReservation.id).where(AIUsageReservation.status.in_(["reserved","processing"]),AIUsageReservation.updated_at<stale_cutoff).limit(1000)).all())
        stripe_failed=len(db.scalars(select(StripeWebhookEvent.event_id).where(StripeWebhookEvent.status=="failed").limit(1000)).all())
        provider_failures=len(db.scalars(select(AIUsageLedger.id).where(AIUsageLedger.created_at>=now_value-timedelta(hours=1),AIUsageLedger.status.in_(["failed","dependency_failed"])).limit(1000)).all())
        disk=shutil.disk_usage("storage"); disk_percent=round(disk.used/disk.total*100,2)
        checks=[
            ("stale_reservations","critical" if stale>=10 else "warning",stale>0,f"{stale} reservas estão travadas.",{"count":stale}),
            ("stripe_failures","critical",stripe_failed>0,f"{stripe_failed} eventos Stripe falharam.",{"count":stripe_failed}),
            ("provider_failure_spike","warning",provider_failures>=5,f"{provider_failures} falhas de provedor ocorreram na última hora.",{"count":provider_failures}),
            ("storage_pressure","critical" if disk_percent>=95 else "warning",disk_percent>=85,f"Armazenamento está {disk_percent}% ocupado.",{"percent":disk_percent,"free":disk.free}),
        ]
        for kind,severity,active,message,details in checks:
            current=db.scalar(select(SystemAlert).where(SystemAlert.kind==kind,SystemAlert.status=="open").order_by(SystemAlert.created_at.desc()).limit(1))
            if active and not current: db.add(SystemAlert(kind=kind,severity=severity,status="open",message=message,details=details)); created.append(kind)
            elif not active and current: current.status="resolved"; current.resolved_at=now_value
        db.commit(); return {"created":created,"stale":stale,"stripe_failed":stripe_failed,"provider_failures":provider_failures,"disk_percent":disk_percent}
    except Exception:
        db.rollback(); raise
    finally: db.close()

@celery.task(name="app.worker.reconcile_stale_reservations")
def reconcile_stale_reservations():
    cutoff=datetime.now(timezone.utc)-timedelta(minutes=max(5,settings.reservation_stale_minutes))
    db=SessionLocal(); reconciled=charged=refunded=0
    try:
        ids=db.scalars(select(AIUsageReservation.id).where(AIUsageReservation.status.in_(["reserved","processing"]),AIUsageReservation.updated_at<cutoff).limit(200)).all()
        for reservation_id in ids:
            item=db.scalar(select(AIUsageReservation).where(AIUsageReservation.id==reservation_id).with_for_update(skip_locked=True))
            if not item or item.status not in {"reserved","processing"}: continue
            provider_completed=bool(db.scalar(select(AIUsageLedger.id).where(AIUsageLedger.reservation_id==item.id,AIUsageLedger.status=="provider_completed").limit(1)))
            if provider_completed:
                final_cost=item.actual_cost if item.actual_cost is not None else item.estimated_cost
                if item.company_id and item.user_id:
                    user=db.get(User,item.user_id)
                    if user and user.role!="superadmin":
                        company=db.scalar(select(Company).where(Company.id==item.company_id).with_for_update())
                        if company: company.api_budget_used=max(0,float(company.api_budget_used)+(float(final_cost)-float(item.estimated_cost)))
                elif item.anonymous_device_hash:
                    allowance=db.scalar(select(AnonymousAllowance).where(AnonymousAllowance.device_hash==item.anonymous_device_hash).with_for_update())
                    if allowance: allowance.api_budget_used=max(0,float(allowance.api_budget_used)+(float(final_cost)-float(item.estimated_cost))); allowance.updated_at=datetime.now(timezone.utc)
                item.status="provider_completed_client_disconnected"; item.final_credits=item.reserved_credits; item.finalized_at=datetime.now(timezone.utc); item.updated_at=datetime.now(timezone.utc); item.error_code="reconciled_after_stale"
                append_event(db,item,item.status,item.error_code,item.reserved_credits); charged+=1
                create_alert(db,"stale_reservation_charged","warning","Reserva travada foi finalizada porque o provedor já havia concluído.",{"reservation_id":item.id,"provider":item.provider,"model":item.model})
            else:
                if item.company_id and item.reserved_credits:
                    company=db.scalar(select(Company).where(Company.id==item.company_id).with_for_update())
                    if company:
                        plan_credits=PLAN_CREDITS.get(company.plan,100)
                        company.credit_balance=min(plan_credits,company.credit_balance+item.reserved_credits); company.api_budget_used=max(0,float(company.api_budget_used)-float(item.estimated_cost))
                elif item.anonymous_device_hash and item.reserved_credits:
                    allowance=db.scalar(select(AnonymousAllowance).where(AnonymousAllowance.device_hash==item.anonymous_device_hash).with_for_update())
                    if allowance: allowance.credit_balance+=item.reserved_credits; allowance.api_budget_used=max(0,float(allowance.api_budget_used)-float(item.estimated_cost)); allowance.updated_at=datetime.now(timezone.utc)
                append_event(db,item,"failed","stale_without_provider_completion",item.reserved_credits)
                item.status="refunded"; item.final_credits=0; item.finalized_at=datetime.now(timezone.utc); item.updated_at=datetime.now(timezone.utc); item.error_code="stale_auto_refund"
                append_event(db,item,"refunded",item.error_code,0); refunded+=1
                create_alert(db,"stale_reservation_refunded","info","Reserva travada sem confirmação do provedor foi reembolsada.",{"reservation_id":item.id,"provider":item.provider,"model":item.model})
            reconciled+=1; db.commit()
        return {"reconciled":reconciled,"charged":charged,"refunded":refunded}
    except Exception:
        db.rollback(); raise
    finally: db.close()
