import psycopg

DB_URL = "postgresql://postgres.pzypxpzysomzmwascuzd:AgencyFlow2025.@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

def clean_db():
    try:
        conn = psycopg.connect(DB_URL)
        cur = conn.cursor()
        
        # 1. Delete user from public.users to avoid unique constraint violations on email
        cur.execute("DELETE FROM public.users WHERE email = 'hazemghazel@aiesec.net'")
        
        # Also delete any other test users if needed
        # cur.execute("TRUNCATE public.users CASCADE") 
        
        conn.commit()
        print("Successfully cleaned public.users table.")
            
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    clean_db()
