import psycopg
import time

# User's suggested session connection
# password was PFEAGENCYFLOW as seen in previous logs
conn_str = "postgresql://postgres.thshaqgjddeenotiefcm:PFEAGENCYFLOW@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=10"

print(f"Testing Session Connection: {conn_str.replace('PFEAGENCYFLOW', '****')}")

try:
    start_time = time.time()
    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()
            print(f"SUCCESS! Connected in {time.time() - start_time:.2f} seconds.")
            print(f"Database version: {version[0]}")
except Exception as e:
    print(f"FAILED to connect: {e}")
