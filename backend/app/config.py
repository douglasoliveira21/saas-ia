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
    deepinfra_native_url: str = "https://api.deepinfra.com/v1/inference"
    tavily_api_key: str = ""
    tavily_base_url: str = "https://api.tavily.com"
    embedding_ai_model: str = "BAAI/bge-m3"
    embedding_dimensions: int = 1024
    rag_top_k: int = 8
    rag_min_similarity: float = 0.32
    default_ai_model: str = "deepseek-ai/DeepSeek-V4-Flash"
    document_ai_model: str = "deepseek-ai/DeepSeek-V4-Pro"
    code_ai_model: str = "Qwen/Qwen3-Coder-480B-A35B-Instruct-Turbo"
    vision_ai_model: str = "Qwen/Qwen3-VL-235B-A22B-Instruct"
    reasoning_ai_model: str = "deepseek-ai/DeepSeek-R1-0528"
    image_ai_model: str = "black-forest-labs/FLUX-2-pro"
    image_edit_ai_model: str = "black-forest-labs/FLUX.1-Kontext-dev"
    audio_ai_model: str = "mistralai/Voxtral-Mini-3B-2507"
    noisy_audio_ai_model: str = "mistralai/Voxtral-Small-24B-2507"
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
