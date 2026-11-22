"""Motor de IA intercambiable: Claude (API) o Llama local (Ollama). Sin ninguno, la carga usa lectura básica."""
from __future__ import annotations

import json
import os
from pathlib import Path

import httpx


def _settings_path() -> Path:
    """La clave guardada desde la herramienta vive junto a la base de datos, fuera de GitHub."""
    return Path(os.environ.get("RS_DB", "data/report_studio.db")).parent / ".rs_ai.json"


def load_settings() -> dict:
    try:
        return json.loads(_settings_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_settings(key: str, model: str = "") -> None:
    p = _settings_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({"anthropic_key": key.strip(), "model": model.strip()}), encoding="utf-8")
    try:
        p.chmod(0o600)   # solo el dueño del computador puede leerla
    except OSError:
        pass


def clear_settings() -> None:
    try:
        _settings_path().unlink()
    except OSError:
        pass


def api_key() -> tuple[str, str]:
    """(clave, origen): la variable de entorno manda sobre la guardada en la herramienta."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return os.environ["ANTHROPIC_API_KEY"], "entorno"
    k = load_settings().get("anthropic_key", "")
    return (k, "herramienta") if k else ("", "")


def model_name() -> str:
    return os.environ.get("RS_ANTHROPIC_MODEL") or load_settings().get("model") or "claude-sonnet-5-5"


def engine() -> str | None:
    forced = os.environ.get("RS_LLM", "").lower()
    if forced == "none":
        return None
    if forced in ("anthropic", "ollama"):
        return forced
    if api_key()[0]:
        return "anthropic"
    if os.environ.get("RS_OLLAMA_URL"):
        return "ollama"
    return None


def complete(system: str, user: str, max_tokens: int = 6000) -> str:
    e = engine()
    if e == "anthropic":
        r = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": api_key()[0], "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": model_name(), "max_tokens": max_tokens, "system": system,
                  "messages": [{"role": "user", "content": user}]},
            timeout=180)
        r.raise_for_status()
        return "".join(b.get("text", "") for b in r.json()["content"])
    if e == "ollama":
        url = os.environ.get("RS_OLLAMA_URL", "http://localhost:11434").rstrip("/")
        r = httpx.post(f"{url}/api/chat", json={
            "model": os.environ.get("RS_OLLAMA_MODEL", "llama3.1:70b"), "stream": False, "format": "json",
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "options": {"num_ctx": 32768, "temperature": 0.1}}, timeout=600)
        r.raise_for_status()
        return r.json()["message"]["content"]
    raise RuntimeError("No hay motor de IA configurado")
