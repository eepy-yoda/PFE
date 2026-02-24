from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    exit(1)

print(f"Testing connection to: {DATABASE_URL.split('@')[1]}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("SUCCESS: Connection to Supabase is working!")
except Exception as e:
    print(f"FAILURE: Could not connect to Supabase. Error: {e}")
    print("\nPRO TIP: This usually means your ISP is blocking Port 5432.")
    print("Try turning on a VPN (like ProtonVPN or Warp) and run this again.")
