"""Usuarios y permisos. Sin usuarios creados, la herramienta queda abierta (modo local); con el primero, exige ingreso.

Roles: «admin» (todo) y «lider» (solo puede cambiar las secciones que le asignaron, y las alertas de su grupo).
La sesión viaja en una cookie firmada; el servidor valida cada guardado, no solo la interfaz.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from pathlib import Path

from fastapi import HTTPException, Request

TTL = 60 * 60 * 12


def _secret() -> bytes:
    s = os.environ.get("RS_SECRET")
    if s:
        return s.encode()
    f = Path(os.environ.get("RS_DB", "data/report_studio.db")).parent / ".rs_secret"
    if not f.exists():
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(secrets.token_hex(32))
    return f.read_text().encode()


def hash_pw(pw: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(8)
    return salt + "$" + hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 200_000).hex()


def check_pw(pw: str, stored: str) -> bool:
    salt = stored.split("$", 1)[0]
    return hmac.compare_digest(hash_pw(pw, salt), stored)


def make_token(name: str) -> str:
    body = base64.urlsafe_b64encode(json.dumps({"u": name, "e": int(time.time()) + TTL}).encode()).decode()
    return body + "." + hmac.new(_secret(), body.encode(), hashlib.sha256).hexdigest()


def read_token(tok: str | None) -> str | None:
    try:
        body, sig = (tok or "").rsplit(".", 1)
        if not hmac.compare_digest(sig, hmac.new(_secret(), body.encode(), hashlib.sha256).hexdigest()):
            return None
        d = json.loads(base64.urlsafe_b64decode(body))
        return d["u"] if d["e"] > time.time() else None
    except Exception:
        return None


def current(request: Request, store) -> dict | None:
    """Usuario de la sesión; None = modo abierto (aún no hay usuarios). Lanza 401 si hay usuarios y no hay sesión."""
    if store.count_users() == 0:
        return None
    u = store.get_user(read_token(request.cookies.get("rs_token")) or "")
    if not u:
        raise HTTPException(401, "Ingresa con tu usuario")
    return u


def require_admin(user: dict | None):
    if user is not None and user["role"] != "admin":
        raise HTTPException(403, "Solo el administrador puede hacer esto")


def _locked(o, out=None) -> list[str]:
    """Todas las casillas bloqueadas del informe (en cualquier nivel), como texto estable para compararlas."""
    import json
    out = [] if out is None else out
    if isinstance(o, dict):
        if o.get("locked") is True and "type" in o:
            out.append(json.dumps(o, sort_keys=True, ensure_ascii=False))
        for v in o.values():
            _locked(v, out)
    elif isinstance(o, list):
        for v in o:
            _locked(v, out)
    return sorted(out)


def check_leader_edit(user: dict | None, old: dict, new: dict):
    """Un líder solo cambia sus secciones y las alertas de su grupo; todo lo demás debe quedar idéntico."""
    if user is None or user["role"] == "admin":
        return
    mine = set(user["sections"])
    o_ids = [s["id"] for s in old["sections"]]
    n_ids = [s["id"] for s in new["sections"]]
    if o_ids != n_ids:
        raise HTTPException(403, "No puedes crear, borrar ni reordenar secciones")
    if old["meta"] != new["meta"]:
        raise HTTPException(403, "La portada y el tema solo los cambia el administrador")
    for a, b in zip(old["sections"], new["sections"]):
        if a["id"] not in mine and a != b:
            raise HTTPException(403, f"No tienes permiso para cambiar la sección «{a.get('label', a['id'])}»")
    lo, ln = _locked(old), _locked(new)
    if lo != ln:
        raise HTTPException(403, "Hay casillas bloqueadas: solo el administrador puede moverlas, cambiarlas, borrarlas o desbloquearlas")
    keep = lambda L: [x for x in L if x["group"] not in mine]  # noqa: E731
    if keep(old.get("alerts", [])) != keep(new.get("alerts", [])):
        raise HTTPException(403, "Solo puedes cambiar las alertas de tu grupo")
