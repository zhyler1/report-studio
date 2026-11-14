"""Motor de IA intercambiable: Claude (API) o Llama local (Ollama). Sin ninguno, la carga usa lectura básica."""
from __future__ import annotations

import os

import httpx


def engine() -> str | None:
    forced = os.environ.get("RS_LLM", "").lower()
    if forced == "none":
        return None
    if forced in ("anthropic", "ollama"):
        return forced
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.environ.get("RS_OLLAMA_URL"):
        return "ollama"
    return None


def complete(system: str, user: str, max_tokens: int = 6000) -> str:
    e = engine()
    if e == "anthropic":
        r = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": os.environ.get("RS_ANTHROPIC_MODEL", "claude-sonnet-5-5"), "max_tokens": max_tokens, "system": system,
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
