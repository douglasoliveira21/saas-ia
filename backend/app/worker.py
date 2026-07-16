from celery import Celery
import httpx
from app.config import settings
from app.rag import index_file
celery=Celery("nexora",broker=settings.redis_url,backend=settings.redis_url)
@celery.task(bind=True,autoretry_for=(ConnectionError,httpx.HTTPError),retry_backoff=True,retry_kwargs={"max_retries":3})
def process_document(self,file_id:str): return index_file(file_id)
