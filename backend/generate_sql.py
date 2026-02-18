from app.db.session import Base
from app.models.user import User
from sqlalchemy.schema import CreateTable
from sqlalchemy import create_mock_engine

def dump(sql, *multiparams, **params):
    print(sql.compile(dialect=engine.dialect))

engine = create_mock_engine('postgresql://', dump)
print("-- AgencyFlow Database Schema --")
print("-- Copy this into the Supabase SQL Editor --\n")
print(CreateTable(User.__table__).compile(engine))
