import asyncio
import os
import sys

# ensure app is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db.session import engine

def migrate():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        print("Checking paymenttype ENUM...")
        try:
            conn.execute(text("CREATE TYPE paymenttype AS ENUM ('project', 'task');"))
            print("Created paymenttype ENUM.")
        except Exception as e:
            print("paymenttype ENUM might already exist.")
            
        print("Checking deliverystate ENUM...")
        try:
            conn.execute(text("CREATE TYPE task_deliverystate AS ENUM ('not_delivered', 'watermark_delivered', 'final_delivered');"))
            print("Created task_deliverystate ENUM.")
        except Exception as e:
            print("task_deliverystate ENUM might already exist.")
            
        print("Updating paymentstatus ENUM...")
        try:
            conn.execute(text("ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'unpaid';"))
            conn.execute(text("ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'partially_paid';"))
            conn.execute(text("ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'fully_paid';"))
            print("Updated paymentstatus ENUM.")
        except Exception as e:
            print(f"paymentstatus error: {e}")

        print("Checking task_paymentstatus ENUM...")
        try:
            conn.execute(text("CREATE TYPE task_paymentstatus AS ENUM ('unpaid', 'partially_paid', 'fully_paid', 'pending', 'paid', 'overdue');"))
            print("Created task_paymentstatus ENUM.")
        except Exception as e:
            print("task_paymentstatus ENUM might already exist.")
            
        print("Adding columns to projects table...")
        try:
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_type paymenttype DEFAULT 'project';"))
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_project_price FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS amount_paid FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_updated_at TIMESTAMP WITH TIME ZONE;"))
            print("Added payment fields to projects table.")
        except Exception as e:
            print(f"Error updating projects table: {e}")
            
        
        print("Adding columns to tasks table...")
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payment_status task_paymentstatus DEFAULT 'unpaid';"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS amount_paid FLOAT DEFAULT 0.0;"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS final_delivered_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS watermarked_delivered_at TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS delivery_state task_deliverystate DEFAULT 'not_delivered';"))
            conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_payment_update_at TIMESTAMP WITH TIME ZONE;"))
            print("Added payment fields to tasks table.")
        except Exception as e:
            print(f"Error updating tasks table: {e}")

        # Data migration logic
        # For legacy data: Map pending -> unpaid, paid -> fully_paid safely
        print("Migrating legacy data...")
        try:
            conn.execute(text("UPDATE projects SET payment_status = 'unpaid' WHERE payment_status = 'pending';"))
            conn.execute(text("UPDATE projects SET payment_status = 'fully_paid' WHERE payment_status = 'paid';"))
            conn.execute(text("UPDATE projects SET payment_status = 'unpaid' WHERE payment_status IS NULL;"))
            print("Legacy data mapped safely.")
        except Exception as e:
            print(f"Legacy data migration error: {e}")

if __name__ == "__main__":
    migrate()
    print("Migration complete!")
