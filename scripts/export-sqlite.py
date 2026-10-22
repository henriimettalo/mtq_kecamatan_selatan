"""Export an existing SQLite database without modifying it."""
import json
import sqlite3
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("python3 scripts/export-sqlite.py /path/mtq.db /private/path/legacy.json")
source, output = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
connection = sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)
connection.row_factory = sqlite3.Row
tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
result = {}
for table in ["events", "site_settings", "participants", "event_settings_audit", "api_keys", "participant_audit_logs"]:
    if table in tables:
        result[table] = [dict(row) for row in connection.execute(f'SELECT * FROM "{table}"')]
with output.open("x", encoding="utf-8") as file:
    output.chmod(0o600)
    json.dump(result, file, ensure_ascii=False)
connection.close()
print("Ekspor selesai. Berkas berisi data pribadi; simpan di lokasi privat.")
