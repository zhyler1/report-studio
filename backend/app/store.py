"""Almacén SQLite: informes y su historial de versiones (cada guardado crea una versión)."""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    def __init__(self, path: str | None = None):
        path = path or os.environ.get("RS_DB", "data/report_studio.db")
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.lock = threading.Lock()
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, created TEXT, updated TEXT, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS versions(id INTEGER PRIMARY KEY AUTOINCREMENT, report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
            n INTEGER NOT NULL, created TEXT, note TEXT DEFAULT '', data TEXT NOT NULL, UNIQUE(report_id, n));
        CREATE TABLE IF NOT EXISTS users(name TEXT PRIMARY KEY, pw TEXT NOT NULL, role TEXT NOT NULL, sections TEXT NOT NULL DEFAULT '[]');
        PRAGMA foreign_keys=ON;
        """)

    def _title(self, data: dict) -> str:
        m = data.get("meta", {})
        return f'{m.get("title", "Informe")} · {m.get("subtitle", "")}'.strip(" ·")

    def create(self, data: dict, note: str = "Versión inicial") -> int:
        with self.lock, self.db:
            t = _now()
            cur = self.db.execute("INSERT INTO reports(title,created,updated,data) VALUES(?,?,?,?)", (self._title(data), t, t, json.dumps(data, ensure_ascii=False)))
            rid = cur.lastrowid
            self.db.execute("INSERT INTO versions(report_id,n,created,note,data) VALUES(?,?,?,?,?)", (rid, 1, t, note, json.dumps(data, ensure_ascii=False)))
            return rid

    def list(self) -> list[dict]:
        rows = self.db.execute("SELECT r.id,r.title,r.created,r.updated,(SELECT MAX(n) FROM versions v WHERE v.report_id=r.id) AS version FROM reports r ORDER BY r.updated DESC, r.id DESC").fetchall()
        return [dict(r) for r in rows]

    def get(self, rid: int) -> dict | None:
        r = self.db.execute("SELECT * FROM reports WHERE id=?", (rid,)).fetchone()
        if not r:
            return None
        v = self.db.execute("SELECT MAX(n) FROM versions WHERE report_id=?", (rid,)).fetchone()[0]
        return {"id": r["id"], "title": r["title"], "created": r["created"], "updated": r["updated"], "version": v, "data": json.loads(r["data"])}

    def update(self, rid: int, data: dict, note: str = "") -> int | None:
        with self.lock, self.db:
            if not self.db.execute("SELECT 1 FROM reports WHERE id=?", (rid,)).fetchone():
                return None
            n = self.db.execute("SELECT MAX(n) FROM versions WHERE report_id=?", (rid,)).fetchone()[0] + 1
            t = _now()
            js = json.dumps(data, ensure_ascii=False)
            self.db.execute("UPDATE reports SET title=?,updated=?,data=? WHERE id=?", (self._title(data), t, js, rid))
            self.db.execute("INSERT INTO versions(report_id,n,created,note,data) VALUES(?,?,?,?,?)", (rid, n, t, note, js))
            return n

    def delete(self, rid: int) -> bool:
        with self.lock, self.db:
            self.db.execute("DELETE FROM versions WHERE report_id=?", (rid,))
            return self.db.execute("DELETE FROM reports WHERE id=?", (rid,)).rowcount > 0

    def versions(self, rid: int) -> list[dict]:
        rows = self.db.execute("SELECT n,created,note FROM versions WHERE report_id=? ORDER BY n DESC", (rid,)).fetchall()
        return [dict(r) for r in rows]

    def version_data(self, rid: int, n: int) -> dict | None:
        r = self.db.execute("SELECT data FROM versions WHERE report_id=? AND n=?", (rid, n)).fetchone()
        return json.loads(r["data"]) if r else None

    # ── usuarios ──
    def count_users(self) -> int:
        return self.db.execute("SELECT COUNT(*) FROM users").fetchone()[0]

    def get_user(self, name: str) -> dict | None:
        r = self.db.execute("SELECT * FROM users WHERE name=?", (name,)).fetchone()
        return {"name": r["name"], "pw": r["pw"], "role": r["role"], "sections": json.loads(r["sections"])} if r else None

    def list_users(self) -> list[dict]:
        return [{"name": r["name"], "role": r["role"], "sections": json.loads(r["sections"])} for r in self.db.execute("SELECT * FROM users ORDER BY name")]

    def put_user(self, name: str, pw_hash: str, role: str, sections: list[str]):
        with self.lock, self.db:
            self.db.execute("INSERT INTO users(name,pw,role,sections) VALUES(?,?,?,?) ON CONFLICT(name) DO UPDATE SET pw=excluded.pw, role=excluded.role, sections=excluded.sections",
                            (name, pw_hash, role, json.dumps(sections)))

    def del_user(self, name: str) -> bool:
        with self.lock, self.db:
            return self.db.execute("DELETE FROM users WHERE name=?", (name,)).rowcount > 0
