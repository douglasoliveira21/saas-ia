from celery import Celery
from app.config import settings
celery=Celery("nexora",broker=settings.redis_url,backend=settings.redis_url)
@celery.task
def process_document(file_id:str): return {"file_id":file_id,"status":"prepared_for_rag"}
