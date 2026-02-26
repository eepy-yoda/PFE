from sqlalchemy import text
from app.db.session import engine

def migrate():
    print("Starting manual migration for PostgreSQL enum...")
    
    # We use a raw connection to avoid transaction issues with ALTER TYPE
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        # 1. Add 'briefing' to ProjectStatus enum
        try:
            print("Trying to add 'briefing' to projectstatus enum...")
            conn.execute(text("ALTER TYPE projectstatus ADD VALUE 'briefing' BEFORE 'planning'"))
            print("Successfully added 'briefing' to enum.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print("Value 'briefing' already exists in enum.")
            else:
                print(f"Error adding enum value: {e}")

        # 2. Add columns to projects table
        columns = [
            ("brief_history", "TEXT"),
            ("next_question", "TEXT"),
            ("brief_content", "TEXT")
        ]
        
        for col_name, col_type in columns:
            try:
                print(f"Checking for column {col_name}...")
                # Check existance
                check = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name='{col_name}'"))
                if not check.fetchone():
                    print(f"Adding column {col_name}...")
                    conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}"))
                    print(f"Column {col_name} added.")
                else:
                    print(f"Column {col_name} already exists.")
            except Exception as e:
                print(f"Error adding column {col_name}: {e}")

    print("Migration finished.")

if __name__ == "__main__":
    migrate()
