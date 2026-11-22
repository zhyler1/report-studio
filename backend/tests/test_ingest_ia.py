"""Carga con IA (motor simulado): casillas especiales por grupo, dudas y descarte de lo inválido."""
import json

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
    from fastapi.testclient import TestClient
    import os
    os.environ["RS_DB"] = str(tmp_path / "t.db"); os.environ["RS_MEDIA"] = str(tmp_path / "m")
    from app.api import create_app
    seen = fake(monkeypatch, RESP)
    c = TestClient(create_app())
    r = c.post("/api/ingest/propose", json={"text": TXT, "hint": "", "section": "personal"})
    assert r.status_code == 200 and r.json()["engine"] == "anthropic" and "SIGEPRE" in seen["system"]
