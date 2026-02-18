from app.db.session import engine, Base
from app.models import user, project

print("Recreating database tables...")
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

import sqlite3
conn = sqlite3.connect('agencyflow.db')
cursor = conn.cursor()
cursor.execute('PRAGMA table_info(users)')
cols = [col[1] for col in cursor.fetchall()]
print(f"Users Table Columns: {cols}")

if 'is_verified' in cols and 'verification_token' in cols:
    print("SUCCESS: Verification columns added!")
else:
    print("FAILED: Columns missing.")
conn.close()
