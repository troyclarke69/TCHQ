from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root is two levels above backend/app/
_ROOT_DIR = Path(__file__).resolve().parents[2]
_ENV_FILES = (
    _ROOT_DIR / ".env",
    Path(__file__).resolve().parents[1] / ".env",
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "TCHQ API"
    cors_origins: str = "http://localhost:5173,https://troyclarke2026.netlify.app"

    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/tchq"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_token_minutes: int = 60 * 24 * 7

    admin_email: str = ""
    admin_password: str = ""

    # When False, skips the schema-introspection + seed-check DB round trips
    # on process startup. Safe to disable once the schema is stable in
    # production (set RUN_STARTUP_INIT=false as a Fly secret) to shave a
    # couple of DB round-trips off every cold start.
    run_startup_init: bool = True


settings = Settings()
