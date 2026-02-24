import os
from app.core.config import settings

print("--- Backend Configuration Check ---")
print(f"DATABASE_URL from settings: {settings.DATABASE_URL}")

if settings.DATABASE_URL.startswith("postgresql://"):
    print("\nWARNING: Your connection string starts with 'postgresql://'.")
    print("This requires 'psycopg2', which is not installed.")
    print("Please ensure it starts with 'postgresql+psycopg://' in your .env file.")
elif settings.DATABASE_URL.startswith("postgresql+psycopg://"):
    print("\nOK: Using 'psycopg' (v3) driver.")
else:
    print("\nINFO: Using a different driver (e.g. SQLite).")

# Check if we can reach the host
host = settings.DATABASE_URL.split("@")[-1].split(":")[0].split("/")[0]
if "localhost" not in host and host:
    print(f"\nProbing host: {host}")
    import socket
    try:
        ip = socket.gethostbyname(host)
        print(f"DNS Resolution: OK ({ip})")
    except Exception as e:
        print(f"DNS Resolution: FAILED ({e})")
        print("TIP: This is why your backend won't start. Your network cannot find this host.")
