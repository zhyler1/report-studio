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
