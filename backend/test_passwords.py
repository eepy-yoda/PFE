import psycopg
import time

PROJECT_ID = "thshaqgjddeenotiefcm"
PASSWORDS = ["AGENCYFLOWPFE", "PFEAGENCYFLOW"]
HOST = "13.60.102.132" # Regional pooler IP
USER_BASE = f"postgres.{PROJECT_ID}"

for pwd in PASSWORDS:
    conn_str = f"postgres://{USER_BASE}:{pwd}@{HOST}:6543/postgres?sslmode=require&connect_timeout=10"
    print(f"\n--- Testing Password: {pwd} ---")
    try:
        start = time.time()
        with psycopg.connect(conn_str) as conn:
            print(f"SUCCESS with {pwd} in {time.time() - start:.2f}s")
            break
    except Exception as e:
        print(f"FAILED with {pwd}: {e}")
