import hashlib, secrets
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User
pwd=CryptContext(schemes=["bcrypt"],deprecated="auto"); bearer=HTTPBearer(auto_error=False); ALGORITHM="HS256"
def hash_password(v): return pwd.hash(v)
def verify_password(v,h): return pwd.verify(v,h)
def create_token(user, minutes=30): return jwt.encode({"sub":user.id,"company_id":user.company_id,"role":user.role,"ver":user.token_version,"exp":datetime.now(timezone.utc)+timedelta(minutes=minutes)},settings.secret_key,algorithm=ALGORITHM)
def random_token(): return secrets.token_urlsafe(48)
def token_hash(v): return hashlib.sha256(v.encode()).hexdigest()
def current_user(credentials:HTTPAuthorizationCredentials=Depends(bearer),db:Session=Depends(get_db)):
    if not credentials: raise HTTPException(401,"Autenticação necessária")
    try: payload=jwt.decode(credentials.credentials,settings.secret_key,algorithms=[ALGORITHM]); user_id=payload["sub"]
    except (JWTError,KeyError): raise HTTPException(401,"Token inválido")
    user=db.get(User,user_id)
    if not user or user.status!="active" or payload.get("ver",0)!=user.token_version: raise HTTPException(401,"Sessão expirada")
    return user
def require_roles(*roles):
    def check(user=Depends(current_user)):
        if user.role not in roles: raise HTTPException(403,"Permissão insuficiente")
        return user
    return check
