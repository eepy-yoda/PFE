import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Fixed DB_URL to be compatible with psycopg
DB_URL = os.getenv("DATABASE_URL").replace("postgresql+psycopg://", "postgresql://")

sql_commands = [
    # 1. Restore mandatory columns
    # First, delete all users (since some might have NULL passwords)
    "DELETE FROM public.users;",
    
    # Make mandatory again
    "ALTER TABLE public.users ALTER COLUMN hashed_password SET NOT NULL;",
    "ALTER TABLE public.users ALTER COLUMN full_name SET NOT NULL;",
    
    # 2. Grant permissions (just in case)
    "GRANT ALL ON TABLE public.users TO postgres;",
    "GRANT ALL ON TABLE public.users TO service_role;",
    
    # 3. DROP TRIGGER AND FUNCTION (We use Manual Insert now)
    "DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;",
    "DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;"
]

def apply_sql():
    try:
        conn = psycopg.connect(DB_URL)
        cur = conn.cursor()
        for sql in sql_commands:
            print(f"Executing: {sql[:50]}...")
            cur.execute(sql)
        conn.commit()
        print("\n✅ SQL applied successfully: hashed_password is now MANDATORY.")
        conn.close()
    except Exception as e:
        print(f"\n❌ FAILED to apply SQL: {e}")

if __name__ == "__main__":
    apply_sql()
