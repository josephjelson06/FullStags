from __future__ import annotations

import logging
import os

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

configured_database_url = os.getenv("DATABASE_URL", "").strip()
if configured_database_url and not configured_database_url.startswith("sqlite+aiosqlite://"):
    logger.warning(
        "Ignoring non-sqlite DATABASE_URL for this module: %s",
        configured_database_url,
    )
    configured_database_url = ""

DATABASE_URL = configured_database_url or "sqlite+aiosqlite:///./app.db"

engine = create_async_engine(
    DATABASE_URL,
    future=True,
    echo=False,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
