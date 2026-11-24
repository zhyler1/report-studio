"""Carga con IA (motor simulado): casillas especiales por grupo, dudas y descarte de lo inválido."""
import json

from fastapi.testclient import TestClient

from app import ingest, llm

TXT = "Planta permanente: 586 provistos y 283 vacantes. NCR-1359 vencida, 80 %, cierre 20/11/2026."

RESP = {
    "blocks": [
        {"type": "plants", "plants": [{"label": "Planta Permanente", "provistos": 586, "vacantes": 283}], "procesos": 121,
         "procesos_label": "Procesos de vinculación", "posesiones": 60, "posesiones_label": "Posesiones realizadas", "logro": "Se gestionaron 121 procesos."},
        {"type": "table", "title": "Alertas y riesgos", "columns": [
            {"key": "codigo", "label": "Código", "format": "text"}, {"key": "estado", "label": "Estado", "format": "pill"},
            {"key": "avance", "label": "Avance", "format": "pct_bar"}, {"key": "cierre", "label": "Cierre", "format": "text"}],
         "rows": [{"codigo": "NCR-1359", "estado": "Vencida", "avance": 80, "cierre": "20/11/2026"}]},
        {"type": "workflow", "heading": "Planta transitoria", "steps": [{"n": 1, "title": "Solicitar justificación", "owner": "Oficina", "status": "ejecutado"}]},
        {"type": "workflow", "heading": "Inválido", "steps": [{"n": 1, "title": "x", "status": "terminado"}]},   # estado fuera de lo permitido
    ],
    "dudas": ["No hay fecha de cierre para NCR-1315", "  "],
}


def fake(monkeypatch, resp):
    seen = {}
    monkeypatch.setattr(llm, "engine", lambda: "anthropic")
    def complete(system, user, max_tokens=6000):
        seen["system"], seen["user"] = system, user
        return "```json\n" + json.dumps(resp, ensure_ascii=False) + "\n```"
    monkeypatch.setattr(llm, "complete", complete)
    return seen


def test_propone_casillas_especiales_y_dudas(monkeypatch):
    seen = fake(monkeypatch, RESP)
    r = ingest.propose(TXT, "", "personal")
    assert [b["type"] for b in r["blocks"]] == ["plants", "table", "workflow"]
    assert r["blocks"][1]["rows"][0]["avance"] == 80
    assert "Revisar: No hay fecha de cierre para NCR-1315" in r["issues"]
    assert not any(i.strip() == "Revisar:" for i in r["issues"])            # la duda vacía no cuenta
    assert any("descartada" in i for i in r["issues"])                      # el paso con estado inválido se descarta, no rompe
    assert "Gestión de Personal" in seen["system"] and "SIGEPRE" in seen["system"]   # instrucciones del grupo
    assert "pct_bar" in seen["system"] and "plants" in seen["system"]


def test_otro_grupo_usa_sus_instrucciones(monkeypatch):
    seen = fake(monkeypatch, {"blocks": [], "dudas": []})
    ingest.propose(TXT, "", "nomina")
    assert "NCR1318" in seen["system"] and "SIGEPRE" not in seen["system"]
    seen = fake(monkeypatch, {"blocks": [], "dudas": []})
    ingest.propose(TXT, "", "")
    assert "NCR1318" not in seen["system"]                                    # sin sección: solo la guía general


def test_endpoint_pasa_la_seccion(monkeypatch, tmp_path):
    monkeypatch.setenv("RS_DB", str(tmp_path / "t.db")); monkeypatch.setenv("RS_MEDIA", str(tmp_path / "m"))
    from app.api import create_app, get_store
    from app.store import Store
    st = Store(str(tmp_path / "t.db")); app = create_app(); app.dependency_overrides[get_store] = lambda: st
    seen = fake(monkeypatch, RESP)
    c = TestClient(app)
    r = c.post("/api/ingest/propose", json={"text": TXT, "hint": "", "section": "personal"})
    assert r.status_code == 200 and r.json()["engine"] == "anthropic" and "SIGEPRE" in seen["system"]


# ───────────── clave de la API guardada desde la herramienta (solo administrador) ─────────────
import stat

import pytest


@pytest.fixture
def cli(tmp_path, monkeypatch):
    monkeypatch.setenv("RS_DB", str(tmp_path / "t.db")); monkeypatch.setenv("RS_MEDIA", str(tmp_path / "m"))
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False); monkeypatch.delenv("RS_LLM", raising=False)
    from app.api import create_app, get_store
    from app.store import Store
    st = Store(str(tmp_path / "t.db"))
    app = create_app()
    app.dependency_overrides[get_store] = lambda: st      # base propia: no mezclar usuarios con otras pruebas
    return TestClient(app), tmp_path


KEY = "sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234"


def test_clave_se_guarda_privada_y_nunca_vuelve_completa(cli):
    c, tmp = cli
    assert c.get("/api/ai").json()["engine"] is None
    assert c.put("/api/ai", json={"key": "no-sirve"}).status_code == 422
    r = c.put("/api/ai", json={"key": KEY, "model": ""}); assert r.status_code == 200
    body = r.json()
    assert body["engine"] == "anthropic" and body["source"] == "herramienta"
    assert KEY not in json.dumps(body) and KEY not in c.get("/api/ai").text and body["key_hint"].endswith("1234")
    f = tmp / ".rs_ai.json"
    assert f.exists() and stat.S_IMODE(f.stat().st_mode) == 0o600
    assert c.get("/api/ingest/status").json()["engine"] == "anthropic"     # la carga ya usa IA
    assert c.delete("/api/ai").status_code == 204 and not f.exists()
    assert c.get("/api/ai").json()["engine"] is None


def test_variable_de_entorno_manda_sobre_la_guardada(cli, monkeypatch):
    c, _ = cli
    c.put("/api/ai", json={"key": KEY})
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-ENTORNO-9999")
    b = c.get("/api/ai").json()
    assert b["source"] == "entorno" and b["key_hint"].endswith("9999")


def test_probar_clave_no_filtra_la_clave_en_el_error(cli, monkeypatch):
    c, _ = cli
    assert c.post("/api/ai/test").status_code == 422                        # sin clave
    c.put("/api/ai", json={"key": KEY})
    def boom(system, user, max_tokens=6000): raise RuntimeError("401 con " + KEY)
    monkeypatch.setattr(llm, "complete", boom)
    r = c.post("/api/ai/test"); assert r.status_code == 502 and KEY not in r.text
    monkeypatch.setattr(llm, "complete", lambda *a, **k: "ok")
    assert c.post("/api/ai/test").json() == {"ok": True}


def test_solo_el_administrador_ve_o_cambia_la_clave(cli):
    c, _ = cli
    assert c.post("/api/users", json={"name": "andres", "password": "secreto1", "role": "admin"}).status_code == 201
    c.post("/api/login", json={"name": "andres", "password": "secreto1"})
    assert c.put("/api/ai", json={"key": KEY}).status_code == 200
    assert c.post("/api/users", json={"name": "nomina", "password": "secreto2", "role": "lider", "sections": ["nomina"]}).status_code == 201
    c.post("/api/logout"); c.cookies.clear()
    c.post("/api/login", json={"name": "nomina", "password": "secreto2"})
    for r in (c.get("/api/ai"), c.put("/api/ai", json={"key": "sk-otra-clave-0000000"}), c.delete("/api/ai"), c.post("/api/ai/test")):
        assert r.status_code == 403


def test_marcador_imagen_basico():
    from app import ingest
    t = "- Algo\n[IMAGEN: carrito-1.jpg | Carrito de Compensar]\n[IMAGEN: feria.jpg]\n"
    bl = ingest.basic_blocks(t)
    m = [b for b in bl if b["type"] == "media"]
    assert [x["media"]["slot"] for x in m] == ["carrito-1.jpg", "feria.jpg"]
    assert m[0]["media"]["src"] == "" and m[0]["media"]["caption"] == "Carrito de Compensar"
    ok, issues = ingest._validate(m)
    assert len(ok) == 2 and not issues
