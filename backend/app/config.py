from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    app_name: str = "Nexora AI"
    environment: str = "development"
    secret_key: str = "development-only-change-me"
    database_url: str = "sqlite:///./nexora.db"
    redis_url: str = "redis://localhost:6379/0"
    frontend_url: str = "http://localhost:3000"
    deepinfra_api_key: str = ""
    deepinfra_base_url: str = "https://api.deepinfra.com/v1/openai"
    default_ai_model: str = "meta-llama/Meta-Llama-3.1-70B-Instruct"
    vision_ai_model: str = "Qwen/Qwen2.5-VL-32B-Instruct"
    image_ai_model: str = "black-forest-labs/FLUX-1-schnell"
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_starter_price_id: str = ""
    stripe_professional_price_id: str = ""
    stripe_enterprise_price_id: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    superadmin_email: str = "admin@example.com"
    superadmin_password: str = "ChangeMe123!"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
@lru_cache
def get_settings(): return Settings()
settings = get_settings()
