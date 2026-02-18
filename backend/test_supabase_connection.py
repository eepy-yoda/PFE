import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
print(f"Testing Supabase connection with: {db_url}")

try:
    # Use a short timeout for the test
    engine = create_engine(db_url, connect_args={"connect_timeout": 10})
    with engine.connect() as conn:
        print("SUCCESS: Connection to Supabase established!")
except Exception as e:
    print(f"ERROR: Connection failed: {e}")
    print("\nTroubleshooting Tip: Ensure your IP is allowed in Supabase dashboard and your database password 'PFEAGENCYFLOW' is correct.")
