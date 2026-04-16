"""
Single module that creates and exports both Supabase clients:
  - supabase       : uses ANON key  (public operations, sign-in, sign-up)
  - supabase_admin : uses SERVICE key (admin ops: update_user_by_id, etc.)
"""
from supabase import create_client, Client
from app.core.config import settings

supabase: Client = None        # type: ignore
supabase_admin: Client = None  # type: ignore

try:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    print("[Startup] Supabase client initialised.")
except Exception as _e:
    print(f"[Startup] WARNING: Supabase client init failed: {_e}")

try:
    if settings.SUPABASE_SERVICE_KEY:
        supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        print("[Startup] Supabase admin client initialised.")
    else:
        print("[Startup] WARNING: SUPABASE_SERVICE_KEY not set — admin operations unavailable.")
except Exception as _e:
    print(f"[Startup] WARNING: Supabase admin client init failed: {_e}")
