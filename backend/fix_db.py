import os
import socket
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv, set_key

# Supabase Project Details from current .env
PROJECT_ID = "thshaqgjddeenotiefcm"
DB_USER = "postgres"
DB_PASS = "PFEAGENCYFLOW"
DB_NAME = "postgres"

REGIONAL_POOLERS = [
    "aws-1-eu-north-1.pooler.supabase.com",
    "aws-0-eu-central-1.pooler.supabase.com",
    "aws-0-us-east-1.pooler.supabase.com",
    "aws-0-us-west-1.pooler.supabase.com",
]

def test_connection(host):
    print(f"--- Probing {host} ---")
    # Step 1: DNS Resolve
    try:
        ip = socket.gethostbyname(host)
        print(f"DNS OK: {host} -> {ip}")
    except Exception as e:
        print(f"DNS FAILED for {host}: {e}")
        return False

    # Step 2: Try Connection
    # We use postgres.[project-id] for poolers
    user = f"{DB_USER}.{PROJECT_ID}"
    url = f"postgresql+psycopg://{user}:{DB_PASS}@{host}:6543/{DB_NAME}?sslmode=require&connect_timeout=5"
    
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            print(f"SUCCESS: Connected to {host}")
            return url
    except Exception as e:
        print(f"CONNECTION FAILED for {host}: {e}")
        return False

def main():
    print("Starting Database Auto-Fix Utility...")
    
    successful_url = None
    for host in REGIONAL_POOLERS:
        successful_url = test_connection(host)
        if successful_url:
            break
            
    if successful_url:
        print("\nUpdating .env file...")
        env_path = os.path.join(os.getcwd(), ".env")
        set_key(env_path, "DATABASE_URL", successful_url)
        print(f"SUCCESS! DATABASE_URL updated to use {successful_url}")
        print("You can now start the backend with uvicorn.")
    else:
        print("\nERROR: Could not find a working connection.")
        print("Please check your database password and project ID in .env")

if __name__ == "__main__":
    main()
