import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = "postgresql://postgres.pzypxpzysomzmwascuzd:AgencyFlow2025.@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

def check_db():
    try:
        conn = psycopg.connect(DB_URL)
        cur = conn.cursor()
        
        # Check Users
        cur.execute("SELECT id, email, full_name, role, hashed_password FROM public.users")
        users = cur.fetchall()
        print("\n--- USERS IN DB ---")
        for u in users:
            hp_exists = "YES" if u[4] else "NO"
            print(f"ID: {u[0]} | Email: {u[1]:<20} | Name: {u[2]:<15} | Role: {u[3]:<10} | PW Saved: {hp_exists}")
        print("-------------------\n")
            
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check_db()
