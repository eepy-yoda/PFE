import psycopg
from app.core.config import settings

def check_enum():
    conn = psycopg.connect(settings.DATABASE_URL.replace("postgresql+psycopg://", "postgresql://"))
    cur = conn.cursor()
    
    cur.execute("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'projectstatus'")
    labels = [row[0] for row in cur.fetchall()]
    print(f"Current enum labels: {labels}")
    
    # If 'briefing' is missing, add it
    if 'briefing' not in labels:
        print("Adding 'briefing' to projectstatus enum...")
        # enum additions must be done outside of a transaction block in some versions, 
        # but let's try ALTER TYPE which is standard
        cur.execute("ALTER TYPE projectstatus ADD VALUE 'briefing'")
        conn.commit()
        print("Success!")
    
    conn.close()

if __name__ == "__main__":
    check_enum()
