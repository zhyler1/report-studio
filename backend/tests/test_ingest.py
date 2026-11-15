import io
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import ingest, llm
from app.api import app, get_store
from app.render import render
from app.store import Store
from app.validate import load

SEED = json.loads((Path(__file__).resolve().parents[2] / "seed/report.seed.json").read_text(encoding="utf-8"))


@pytest.fixture()
def c(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("RS_OLLAMA_URL", raising=False)
    st = Store(":memory:")
    app.dependency_overrides[get_store] = lambda: st
    yield TestClient(app)
    app.dependency_overrides.clear()


def docx_bytes():
    import docx
    d = docx.Document()
    d.add_paragraph("Actos administrativos de octubre")
    d.add_paragraph("- Se expidieron 159 actos en los últimos 15 días")
    d.add_paragraph("- Cartera de incapacidades al corte")
    t = d.add_table(rows=3, cols=2)
    for i, r in enumerate([("Mes", "Actos"), ("Sep", "120"), ("Oct", "159")]):
        for j, v in enumerate(r):
            t.cell(i, j).text = v
    b = io.BytesIO(); d.save(b); return b.getvalue()


def pptx_bytes():
    from pptx import Presentation
    p = Presentation(); s = p.slides.add_slide(p.slide_layouts[1])
    s.shapes.title.text = "Gestión de personal"; s.placeholders[1].text = "- Posesiones: 12\n- Vacantes: 121"
    b = io.BytesIO(); p.save(b); return b.getvalue()


def test_extract_docx_pptx_txt(c):
    t = ingest.extract_text("a.docx", docx_bytes())
    assert "159 actos" in t and "[TABLA]" in t and "Oct\t159" in t
    assert "Posesiones" in ingest.extract_text("a.pptx", pptx_bytes())
    assert ingest.extract_text("a.txt", "hola ñ".encode()) == "hola ñ"


def test_basic_blocks_without_ai(c):
    bl = ingest.basic_blocks(ingest.extract_text("a.docx", docx_bytes()))
    kinds = [b["type"] for b in bl]
    assert "table" in kinds and "card_list" in kinds
    assert ingest._validate(bl)[1] == []


def test_propose_api_without_engine_uses_basic(c):
    r = c.post("/api/ingest/propose", json={"text": ingest.extract_text("a.docx", docx_bytes())}).json()
    assert r["engine"] is None and r["blocks"] and r["issues"]


def test_propose_with_ai_validates_and_drops_bad(c, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "x")
    out = {"blocks": [
        {"type": "stat_grid", "items": [{"value": "159", "label": "Actos"}]},
        {"type": "chart", "kind": "bar", "labels": ["A", "B"], "series": [{"name": "S", "values": [1]}]},  # largo distinto: se descarta
        {"type": "inventado"},
    ]}
    monkeypatch.setattr(llm, "complete", lambda s, u, max_tokens=0: "```json\n" + json.dumps(out) + "\n```")
    r = c.post("/api/ingest/propose", json={"text": "x" * 50}).json()
    assert r["engine"] == "anthropic" and [b["type"] for b in r["blocks"]] == ["stat_grid"] and len(r["issues"]) == 2


def test_extract_endpoint_and_bad_format(c):
    r = c.post("/api/ingest/extract", files={"file": ("a.docx", docx_bytes(), "application/octet-stream")}).json()
    assert "159" in r["text"] and r["report"] is None
    assert c.post("/api/ingest/extract", files={"file": ("a.exe", b"MZ", "application/octet-stream")}).status_code == 415
    assert c.get("/api/ingest/status").json()["engine"] is None


def test_exported_html_reimports_losslessly(c):
    rep, _ = load(SEED)
    html = render(rep)
    r = c.post("/api/ingest/extract", files={"file": ("informe.html", html.encode(), "text/html")}).json()
    assert r["report"] and load(r["report"])[1] == [] and r["report"]["meta"]["title"] == SEED["meta"]["title"]
    assert "rs-report" not in render(rep, edit=True)


def test_legacy_handwritten_html_rebuilds_full_report():
    """El HTML escrito a mano (plantilla original) se importa completo, sin IA."""
    from app.ingest import embedded_report
    from app.validate import load
    for f in ("Informe_TH.original.html", "Informe_TH.v9.html"):
        doc = embedded_report(f, (Path(__file__).resolve().parents[2] / "seed" / f).read_bytes())
        assert doc is not None and len(doc["sections"]) == 6 and len(doc["alerts"]) == 23
        assert load(doc)[0] is not None


def test_lectura_basica_sigue_la_guia():
    from app import ingest
    t = ("ALERTAS Y DECISIONES REQUERIDAS\nCapacidad operativa: 8 grupos no cumplen la conformacion minima del equipo.\n"
         "Compromisos próximos\nLiquidar prestaciones sociales de aproximadamente 68 exfuncionarios de octubre.\n")
    b = ingest.basic_blocks(t)
    assert [x["title"] for x in b if x["type"] == "card_list"] == ["Alertas Y Decisiones Requeridas", "Compromisos próximos"]
    assert b[0]["style"] == "warn" and b[1]["style"] == "checks"


def test_tabla_de_diseno_se_descarta():
    from app import ingest
    assert ingest._noisy([["", "", "x"], ["", "", ""]]) is True
    assert ingest._noisy([["a", "b"], ["c", "d"]]) is False


def test_administrador_con_plantilla_en_base64():
    """El HTML del editor viejo ('Administrador') lleva la plantilla en base64: también se importa."""
    import base64
    from app.ingest import embedded_report
    src = (Path(__file__).resolve().parents[2] / "seed" / "Informe_TH.v9.html").read_bytes()
    wrap = ("<html><body><script>var TPL='" + base64.b64encode(src).decode() + "'; function dec(b){}</script></body></html>").encode()
    doc = embedded_report("Administrador.html", wrap)
    assert doc is not None and len(doc["sections"]) == 6
