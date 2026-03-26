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
        cur.execute("SELECT id, email, full_name, role FROM public.users")
        users = cur.fetchall()
        print("\n--- USERS IN DB ---")
        for u in users:
            print(f"ID: {u[0]} | Email: {u[1]:<20} | Name: {u[2]:<15} | Role: {u[3]:<10}")
        
        # Check Notifications
        cur.execute("SELECT id, user_id, title, status, created_at FROM public.notifications")
        notifs = cur.fetchall()
        print("\n--- NOTIFICATIONS IN DB ---")
        for n in notifs:
            print(f"ID: {n[0]} | User: {n[1]} | Title: {n[2]:<25} | Status: {n[3]:<10} | Created: {n[4]}")
        # Check Projects
        cur.execute("SELECT id, name, status, brief_status FROM public.projects")
        projects = cur.fetchall()
        print("\n--- PROJECTS IN DB ---")
        for p in projects:
            print(f"ID: {p[0]} | Name: {p[1]:<20} | Status: {p[2]:<10} | Brief: {p[3]:<10}")
        print("-------------------\n")
            
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check_db()
