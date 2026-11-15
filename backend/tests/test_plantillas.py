import json
import pytest
from fastapi.testclient import TestClient
from app.api import app, get_store
from app.store import Store
from app.schema import Section
from app.templates_lib import BUILTIN
from app import auth


def test_plantillas_incluidas_son_validas():
    for t in BUILTIN:
        Section.model_validate({"id": "x", **t["section"]})


def test_bloqueo_de_casillas_no_lo_cambia_un_lider():
    old = {"meta": {}, "alerts": [], "sections": [{"id": "a", "label": "A", "blocks": [{"type": "card_list", "locked": True, "items": ["x"]}]}]}
    new = json.loads(json.dumps(old))
    auth.check_leader_edit({"role": "lider", "sections": ["a"], "name": "l"}, old, new)  # sin cambios: pasa
    new["sections"][0]["blocks"][0]["items"] = ["y"]
    with pytest.raises(Exception):
        auth.check_leader_edit({"role": "lider", "sections": ["a"], "name": "l"}, old, new)
    new["sections"][0]["blocks"] = []
    with pytest.raises(Exception):
        auth.check_leader_edit({"role": "lider", "sections": ["a"], "name": "l"}, old, new)
    auth.check_leader_edit({"role": "admin", "sections": [], "name": "a"}, old, new)  # el admin sí puede


def test_api_plantillas(tmp_path):
    st = Store(str(tmp_path / "t.db"))
    app.dependency_overrides[get_store] = lambda: st
    try:
        c = TestClient(app)
        r = c.get("/api/templates"); assert r.status_code == 200 and r.json()[0]["builtin"]
        sec = BUILTIN[1]["section"]
        r = c.post("/api/templates", json={"name": "Mía", "section": sec}); assert r.status_code == 201
        lst = c.get("/api/templates").json(); assert any(t["name"] == "Mía" and not t["builtin"] for t in lst)
        assert c.post("/api/templates", json={"name": "x", "section": {"label": "A"}}).status_code == 422
        tid = int(r.json()["id"].split(":")[1]); assert c.delete(f"/api/templates/{tid}").status_code == 204
    finally:
        app.dependency_overrides.clear()
