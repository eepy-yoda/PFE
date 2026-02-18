import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Using Frankfurt pooler as suggested (adjusted to aws-0 which exists)
conn_str = "postgres://postgres.thshaqgjddeenotiefcm:PFEAGENCYFLOW@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=15"

print(f"Connecting to: {conn_str}")
try:
    with psycopg.connect(conn_str) as conn:
        print("SUCCESS! Raw psycopg connection worked!")
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            print(f"Postgres Version: {cur.fetchone()}")
except Exception as e:
    print(f"FAILED raw connection: {e}")
