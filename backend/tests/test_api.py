import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api import app, get_store
from app.store import Store

SEED = json.loads((Path(__file__).resolve().parents[2] / "seed/report.seed.json").read_text(encoding="utf-8"))


@pytest.fixture()
def c():
    st = Store(":memory:")
    app.dependency_overrides[get_store] = lambda: st
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health_and_schema(c):
    assert c.get("/health").json() == {"ok": True}
    assert "properties" in c.get("/api/schema").json() or "$defs" in c.get("/api/schema").json()


def test_validate_ok_and_bad(c):
    assert c.post("/api/validate", json=SEED).json()["ok"] is True
    bad = json.loads(json.dumps(SEED))
    bad["alerts"][0]["group"] = "no-existe"
    r = c.post("/api/validate", json=bad).json()
    assert r["ok"] is False and r["issues"]


def test_crud_and_versions(c):
    r = c.post("/api/reports", json={"data": SEED})
    assert r.status_code == 201
    rid = r.json()["id"]
    assert r.json()["version"] == 1
    d = r.json()["data"]
    d["meta"]["hero_title"] = "Otro título"
    r2 = c.put(f"/api/reports/{rid}", json={"data": d, "note": "cambio de título"})
    assert r2.json()["version"] == 2
    assert [v["n"] for v in c.get(f"/api/reports/{rid}/versions").json()] == [2, 1]
    assert "Otro título" in c.get(f"/api/reports/{rid}/preview").text
    r3 = c.post(f"/api/reports/{rid}/versions/1/restore")
    assert r3.json()["version"] == 3 and r3.json()["data"]["meta"]["hero_title"] == "Reporte de gestión"
    assert len(c.get("/api/reports").json()) == 1
    assert c.delete(f"/api/reports/{rid}").status_code == 204
    assert c.get(f"/api/reports/{rid}").status_code == 404


def test_invalid_save_rejected(c):
    bad = json.loads(json.dumps(SEED))
    bad["alerts"][0]["group"] = "no-existe"
    r = c.post("/api/reports", json={"data": bad})
    assert r.status_code == 422 and r.json()["detail"]["issues"]


def test_export_html_and_draft_render(c):
    rid = c.post("/api/reports", json={"data": SEED}).json()["id"]
    r = c.get(f"/api/reports/{rid}/export.html")
    assert "attachment" in r.headers["content-disposition"] and "<!DOCTYPE html>" in r.text[:200]
    assert c.post("/api/render", json=SEED).status_code == 200


def test_qr(c):
    r = c.get("/api/qr.svg", params={"url": "https://x.test"})
    assert r.status_code == 200 and b"<svg" in r.content


def test_pdf_ok_or_clear_error(c):
    rid = c.post("/api/reports", json={"data": SEED}).json()["id"]
    r = c.get(f"/api/reports/{rid}/export.pdf")
    assert r.status_code in (200, 503)
    if r.status_code == 200:
        assert r.content[:4] == b"%PDF"


def test_media_upload(c, tmp_path, monkeypatch):
    import app.api as api
    monkeypatch.setattr(api, "MEDIA_DIR", tmp_path)
    r = c.post("/api/media", files={"file": ("a.mp3", b"ID3xxxx", "audio/mpeg")})
    assert r.status_code == 200 and r.json()["url"].endswith(".mp3")
    assert (tmp_path / r.json()["name"]).read_bytes() == b"ID3xxxx"
    assert c.post("/api/media", files={"file": ("a.exe", b"MZ", "application/octet-stream")}).status_code == 415


def test_export_embeds_media(c, tmp_path, monkeypatch):
    import app.api as api
    monkeypatch.setattr(api, "MEDIA_DIR", tmp_path)
    name = c.post("/api/media", files={"file": ("a.mp3", b"ID3xxxx", "audio/mpeg")}).json()["name"]
    d = json.loads(json.dumps(SEED))
    d["sections"][0]["blocks"] = [{"type": "media", "title": "Audio", "media": {"kind": "audio", "src": f"/media/{name}", "slot": "a.mp3"}}] + d["sections"][0].get("blocks", [])
    rid = c.post("/api/reports", json={"data": d}).json()["id"]
    assert f"/media/{name}" in c.get(f"/api/reports/{rid}/preview").text
    h = c.get(f"/api/reports/{rid}/export.html").text
    assert f'src="/media/{name}"' not in h and "data:audio/mpeg;base64," in h


def test_texts_override(c):
    import json
    from app.render import render
    from app.validate import load
    d = json.load(open("seed/report.seed.json", encoding="utf-8"))
    r = c.get("/api/texts")
    assert r.status_code == 200 and "per.vac" in json.dumps(r.json())
    d["meta"]["texts"] = {"per.vac": "Cargos por proveer"}
    rep, errs = load(d)
    assert rep is not None, errs
    html = render(rep)
    assert "Cargos por proveer" in html


def test_tints_and_covers():
    import json
    from app.render import render
    from app.validate import load
    d = json.load(open("seed/report.seed.json", encoding="utf-8"))
    sec = next(s for s in d["sections"] if s.get("blocks"))
    sec["blocks"][0]["tints"] = [{"t": "869", "k": 0, "c": "#E8711A"}]
    d["meta"]["theme"]["cover"] = "ondas"
    rep, errs = load(d)
    assert rep is not None, errs
    html = render(rep)
    assert 'class="rs-t"' in html and "data-tint=" in html and 'data-bg="ondas"' in html
    d["meta"]["theme"]["cover"] = "no-existe"
    assert load(d)[0] is None


def test_viz_swaps_ring_for_chart():
    import json
    from app.render import render
    from app.validate import load
    d = json.load(open("seed/report.seed.json", encoding="utf-8"))
    def walk(o):
        if isinstance(o, dict):
            if o.get("type") == "agreement":
                o["viz"] = "gauge"
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(d)
    rep, errs = load(d)
    assert rep is not None, errs
    html = render(rep)
    assert '"vizSpec"' in html and "RSCharts" in html


def test_section_icon_drives_background():
    import json
    from app.render import render
    from app.validate import load
    d = json.load(open("seed/report.seed.json", encoding="utf-8"))
    d["sections"][0]["icon"] = "gear"
    rep, errs = load(d)
    assert rep is not None, errs
    html = render(rep)
    assert '"SB":{' in html.replace("/*@SB*/", "") or '/*@SB*/{"personal":"gear"' in html
    d["sections"][0]["icon"] = "no-existe"
    assert load(d)[0] is None


def test_viz_presupuesto_y_plantas():
    """La dona del presupuesto y las barras de provistos/vacantes se pueden cambiar por otro gráfico."""
    import json
    from app.render import render
    from app.validate import load
    d = json.load(open("seed/report.seed.json", encoding="utf-8"))
    def walk(o):
        if isinstance(o, dict):
            if o.get("type") == "budget":
                o["viz"] = "gauge"
            if o.get("type") == "plants":
                o["viz"] = "donut"
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(d)
    rep, errs = load(d)
    assert rep is not None, errs
    html = render(rep)
    assert 'data-viz="gauge"' in html and '"viz":"donut"' in html and "RSCharts" in html
    base = render(load(json.load(open("seed/report.seed.json", encoding="utf-8")))[0])
    assert 'data-viz=' not in base and "RSCharts" not in base  # el original no cambia ni carga el motor


def test_exporta_pptx(c):
    import io, json
    from pptx import Presentation
    d = json.load(open("seed/report.seed.json", encoding="utf-8"))
    rid = c.post("/api/reports", json={"data": d}).json()["id"]
    r = c.get(f"/api/reports/{rid}/export.pptx")
    assert r.status_code == 200 and r.content[:2] == b"PK"
    prs = Presentation(io.BytesIO(r.content))
    assert len(prs.slides) >= 8
    assert "(cont.) (cont.)" not in " ".join(sh.text_frame.text for sl in prs.slides for sh in sl.shapes if sh.has_text_frame)


def test_usuarios_y_permisos(c):
    import json
    d = json.load(open("seed/report.seed.json", encoding="utf-8"))
    rid = c.post("/api/reports", json={"data": d}).json()["id"]          # modo abierto: sin usuarios
    assert c.get("/api/me").json()["open"] is True
    assert c.post("/api/users", json={"name": "andres", "password": "secreto1", "role": "admin"}).status_code == 201
    assert c.get("/api/reports").status_code == 401                      # ya exige ingreso
    assert c.post("/api/login", json={"name": "andres", "password": "mala"}).status_code == 401
    assert c.post("/api/login", json={"name": "andres", "password": "secreto1"}).status_code == 200
    assert c.post("/api/users", json={"name": "nomina", "password": "secreto2", "role": "lider", "sections": ["nomina"]}).status_code == 201
    c.post("/api/logout"); c.cookies.clear()
    assert c.post("/api/login", json={"name": "nomina", "password": "secreto2"}).status_code == 200
    cur = c.get(f"/api/reports/{rid}").json()["data"]
    mine = json.loads(json.dumps(cur))
    for s in mine["sections"]:
        if s["id"] == "nomina":
            s["subtitle"] = "cambiado por el líder"
    assert c.put(f"/api/reports/{rid}", json={"data": mine}).status_code == 200      # su sección: sí
    other = json.loads(json.dumps(cur))
    for s in other["sections"]:
        if s["id"] == "sst":
            s["subtitle"] = "intento ajeno"
    r = c.put(f"/api/reports/{rid}", json={"data": other})
    assert r.status_code == 403            # la de otro: no
    th = json.loads(json.dumps(cur)); th["meta"]["title"] = "otro"
    assert c.put(f"/api/reports/{rid}", json={"data": th}).status_code == 403
    assert c.delete(f"/api/reports/{rid}").status_code == 403
    assert c.get("/api/users").status_code == 403


def test_disenos_completos():
    import json
    from app.render import render
    from app.validate import load
    base = json.load(open("seed/report.seed.json", encoding="utf-8"))
    assert '<html data-layout' not in render(load(base)[0]) and 'id="rs-layout"' not in render(load(base)[0])          # el clásico no cambia
    for lay in ("lateral", "editorial", "tablero", "continuo"):
        d = json.loads(json.dumps(base)); d["meta"]["theme"]["layout"] = lay
        h = render(load(d)[0])
        assert f'data-layout="{lay}"' in h and 'id="rs-layout"' in h
