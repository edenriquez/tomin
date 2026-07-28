from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, loaded from environment / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///tomin.db"
    cube_path: str = "tomin_cube.duckdb"

    # When true (the default) Container.bootstrap() runs `alembic upgrade head`.
    # Tests set it false and use metadata.create_all instead: they build a fresh
    # throwaway SQLite file per test, so replaying the migration history would
    # only cost time and would test Alembic rather than the app.
    run_migrations: bool = True

    supabase_jwt_secret: str | None = None
    auth_disabled: bool = True
    dev_user_id: str = "00000000-0000-0000-0000-000000000001"

    cors_origins: str = "*"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
