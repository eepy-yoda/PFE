import requests
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("ERROR: SUPABASE_URL or SUPABASE_ANON_KEY missing in .env")
    exit(1)

# The REST API endpoint for the users table
# Note: This requires the table 'users' to exist (which we created via SQL)
url = f"{SUPABASE_URL}/rest/v1/users?select=*"
headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
}

print(f"Testing REST connection to: {url}")
try:
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("SUCCESS: We can talk to Supabase via REST (Port 443)!")
        print(f"Data found: {response.json()[:1]}") # Show first user if any
    else:
        print(f"FAILED: {response.text}")
except Exception as e:
    print(f"ERROR: {e}")
