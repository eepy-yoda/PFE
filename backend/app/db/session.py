import warnings
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

if settings.DATABASE_URL.startswith("sqlite"):
    warnings.warn(
        "DATABASE_URL is using SQLite. This is only suitable for local development. "
        "Set DATABASE_URL to a PostgreSQL connection string for staging/production.",
        RuntimeWarning,
        stacklevel=2,
    )
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
else:
    # Supabase Transaction Mode (port 6543) requires prepare_threshold=None
    # for psycopg3 to avoid "DuplicatePreparedStatement" errors.
    connect_args = {
        "connect_timeout": 10,       # fail fast if DB is paused/unreachable
        "options": "-c statement_timeout=0 -c row_security=off",  # disable Supabase's per-statement timeout + bypass RLS for backend service role
    }
    if "pooler.supabase.com" in settings.DATABASE_URL:
        connect_args["prepare_threshold"] = None

    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_timeout=30,       # give up waiting for a pool slot after 30s
        pool_recycle=180,      # recycle connections every 3 min to avoid Supabase idle timeouts
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
