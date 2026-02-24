import psycopg
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL").replace("postgresql+psycopg://", "postgresql://")

def test_insert():
    try:
        conn = psycopg.connect(DB_URL)
        cur = conn.cursor()
        
        test_id = str(uuid.uuid4())
        test_email = f"test_{secrets.token_hex(4)}@example.com"
        
        print(f"Testing manual insert into public.users with ID: {test_id}")
        
        # This simulates exactly what the trigger does
        sql = """
        INSERT INTO public.users (
            id, 
            email, 
            full_name, 
            role, 
            agency_name,
            is_active,
            is_verified
        )
        VALUES (
            %s,
            %s,
            %s,
            'client'::userrole,
            %s,
            true,
            false
        )
        """
        cur.execute(sql, (test_id, test_email, "Test User", None))
        conn.commit()
        print("✅ Manual insert succeeded! The table structure is correct.")
        
        # Cleanup
        cur.execute("DELETE FROM public.users WHERE id = %s", (test_id,))
        conn.commit()
        
        conn.close()
    except Exception as e:
        print(f"❌ Manual insert FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import secrets
    test_insert()
