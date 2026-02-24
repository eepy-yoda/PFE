import psycopg

DB_URL = "postgresql://postgres.pzypxpzysomzmwascuzd:AgencyFlow2025.@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

def fix_schema():
    try:
        conn = psycopg.connect(DB_URL)
        cur = conn.cursor()
        
        # Make hashed_password nullable
        print("Making hashed_password nullable...")
        cur.execute("ALTER TABLE public.users ALTER COLUMN hashed_password DROP NOT NULL")
        
        # Verify
        cur.execute("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hashed_password'")
        print(f"Update result: {cur.fetchone()}")
        
        conn.commit()
        print("Schema updated successfully!")
            
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    fix_schema()
