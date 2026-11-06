import sqlite3
from pathlib import Path

def migrate():
    data_dir = Path("D:/plantpulse-ai/backend/data")
    for db_path in [data_dir / "plantpulse.db", data_dir / "test_plantpulse.db"]:
        if not db_path.exists():
            continue
        con = sqlite3.connect(str(db_path))
        cur = con.cursor()
        
        # Check plants table
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='plants'")
        if cur.fetchone():
            cur.execute("PRAGMA table_info(plants)")
            cols = [r[1] for r in cur.fetchall()]
            if "user_id" not in cols:
                cur.execute("ALTER TABLE plants ADD COLUMN user_id VARCHAR(36) REFERENCES users(id)")
                con.commit()
                print(f"[Migration] Added user_id to {db_path.name}")
            else:
                print(f"[Migration] user_id column already present in {db_path.name}")
        con.close()

if __name__ == "__main__":
    migrate()
