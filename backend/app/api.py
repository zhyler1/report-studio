"""API REST de Report Studio.

`router` se monta tal cual dentro de Nexus (app.include_router(router, prefix="/report-studio")).
`app` es la aplicación independiente para desarrollo y pruebas.
"""
from __future__ import annotations

import io
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Body, Depends, FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, Response
from pydantic import BaseModel

from .render import render
from .schema import json_schema
from .store import Store
from .validate import load

_store: Store | None = None


def get_store() -> Store:
    global _store
    if _store is None:
        _store = Store()
    return _store


router = APIRouter(prefix="/api", tags=["report-studio"])


class Save(BaseModel):
    data: dict[str, Any]
    note: str = ""


def _valid(data: dict):
    rep, issues = load(data)
    if issues or rep is None:
        raise HTTPException(422, {"message": "El informe tiene errores", "issues": issues})
    return rep


@router.get("/schema")
def schema():
    return json_schema()


@router.post("/validate")
def validate(body: dict[str, Any] = Body(...)):
    _, issues = load(body)
    return {"ok": not issues, "issues": issues}


@router.get("/reports")
def list_reports(s: Store = Depends(get_store)):
    return s.list()


@router.post("/reports", status_code=201)
def create_report(body: Save, s: Store = Depends(get_store)):
    rep = _valid(body.data)
    rid = s.create(rep.model_dump(mode="json"), body.note or "Versión inicial")
    return s.get(rid)


def _get(s: Store, rid: int) -> dict:
    r = s.get(rid)
    if not r:
        raise HTTPException(404, "Informe no encontrado")
    return r


@router.get("/reports/{rid}")
def get_report(rid: int, s: Store = Depends(get_store)):
    return _get(s, rid)


@router.put("/reports/{rid}")
def update_report(rid: int, body: Save, s: Store = Depends(get_store)):
    _get(s, rid)
    rep = _valid(body.data)
    s.update(rid, rep.model_dump(mode="json"), body.note)
    return s.get(rid)


@router.delete("/reports/{rid}", status_code=204)
def delete_report(rid: int, s: Store = Depends(get_store)):
    _get(s, rid)
    s.delete(rid)
    return Response(status_code=204)


@router.get("/reports/{rid}/versions")
def versions(rid: int, s: Store = Depends(get_store)):
    _get(s, rid)
    return s.versions(rid)


@router.get("/reports/{rid}/versions/{n}")
def version(rid: int, n: int, s: Store = Depends(get_store)):
    d = s.version_data(rid, n)
    if d is None:
        raise HTTPException(404, "Versión no encontrada")
    return d


@router.post("/reports/{rid}/versions/{n}/restore")
def restore(rid: int, n: int, s: Store = Depends(get_store)):
    d = s.version_data(rid, n)
    if d is None:
        raise HTTPException(404, "Versión no encontrada")
    s.update(rid, d, f"Restaurada la versión {n}")
    return s.get(rid)


def _html(s: Store, rid: int) -> str:
    return render(_valid(_get(s, rid)["data"]))


@router.get("/reports/{rid}/preview", response_class=HTMLResponse)
def preview(rid: int, s: Store = Depends(get_store)):
    return HTMLResponse(_html(s, rid))


@router.post("/render", response_class=HTMLResponse)
def render_draft(body: dict[str, Any] = Body(...)):
    """Vista previa de un borrador sin guardarlo."""
    return HTMLResponse(render(_valid(body)))


@router.get("/reports/{rid}/export.html")
def export_html(rid: int, s: Store = Depends(get_store)):
    return Response(_html(s, rid), media_type="text/html; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="informe-{rid}.html"'})


@router.get("/reports/{rid}/export.pdf")
def export_pdf(rid: int, s: Store = Depends(get_store)):
    html = _html(s, rid)
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page()
            pg.set_content(html, wait_until="load")
            pg.emulate_media(media="print")
            pdf = pg.pdf(format="A4", print_background=True, margin={"top": "12mm", "bottom": "12mm", "left": "10mm", "right": "10mm"})
            b.close()
    except Exception as e:  # navegador no instalado u otro fallo
        raise HTTPException(503, f"No se pudo generar el PDF: {type(e).__name__}: {str(e)[:200]}")
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="informe-{rid}.pdf"'})


@router.get("/qr.svg")
def qr(url: str = Query(..., max_length=500)):
    import qrcode
    import qrcode.image.svg
    img = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, box_size=10)
    buf = io.BytesIO()
    img.save(buf)
    return Response(buf.getvalue(), media_type="image/svg+xml")


def create_app() -> FastAPI:
    app = FastAPI(title="Report Studio", version="0.2.0")
    app.include_router(router)

    @app.get("/health")
    def health():
        return JSONResponse({"ok": True})

    dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if dist.is_dir():  # la interfaz compilada se sirve desde el mismo servidor
        app.mount("/", StaticFiles(directory=dist, html=True), name="ui")
    return app


app = create_app()
