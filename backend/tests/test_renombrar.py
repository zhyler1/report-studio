"""Renombrar un informe en la barra lateral sin tocar la portada."""
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


def test_renombrar_y_volver_al_nombre_automatico(c):
    rid = c.post("/api/reports", json={"data": SEED}).json()["id"]
    auto = c.get("/api/reports").json()[0]["title"]
    assert auto == "Seguimiento Interno · Oficina de Talento Humano"
    r = c.patch(f"/api/reports/{rid}/name", json={"name": "  Reunión   del 25 de noviembre "})
    assert r.status_code == 200 and r.json()["title"] == "Reunión del 25 de noviembre"
    assert c.get("/api/reports").json()[0]["title"] == "Reunión del 25 de noviembre"
    meta = c.get(f"/api/reports/{rid}").json()["data"]["meta"]
    assert meta["title"] == "Seguimiento Interno" and meta["subtitle"] == "Oficina de Talento Humano"   # la portada no cambia
    # guardar desde el editor conserva el nombre
    data = c.get(f"/api/reports/{rid}").json()["data"]
    c.put(f"/api/reports/{rid}", json={"data": data})
    assert c.get("/api/reports").json()[0]["title"] == "Reunión del 25 de noviembre"
    # vacío: vuelve al automático
    assert c.patch(f"/api/reports/{rid}/name", json={"name": "   "}).json()["title"] == auto
    assert c.patch("/api/reports/9999/name", json={"name": "x"}).status_code == 404


def test_solo_administrador_renombra(c):
    rid = c.post("/api/reports", json={"data": SEED}).json()["id"]
    c.post("/api/users", json={"name": "andres", "password": "secreto1", "role": "admin"})
    c.post("/api/login", json={"name": "andres", "password": "secreto1"})
    c.post("/api/users", json={"name": "nomina", "password": "secreto2", "role": "lider", "sections": ["nomina"]})
    c.post("/api/logout"); c.cookies.clear()
    c.post("/api/login", json={"name": "nomina", "password": "secreto2"})
    assert c.patch(f"/api/reports/{rid}/name", json={"name": "otro"}).status_code == 403
