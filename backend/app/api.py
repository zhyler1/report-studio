"""API REST de Report Studio.

`router` se monta tal cual dentro de Nexus (app.include_router(router, prefix="/report-studio")).
`app` es la aplicación independiente para desarrollo y pruebas.
"""
from __future__ import annotations

import io
import json
import zipfile
import os
import mimetypes
import base64
import re
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Body, Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, Response
from pydantic import BaseModel

from .render import render
from . import auth, ingest, llm
from .schema import json_schema
from .store import Store
from .validate import load

_store: Store | None = None


def get_store() -> Store:
    global _store
    if _store is None:
        _store = Store()
    return _store


def guard(request: Request, s: Store = Depends(get_store)):
    """Exige sesión en toda la API cuando ya existen usuarios (login, sesión y estado quedan abiertos)."""
    if request.url.path.endswith(("/login", "/logout", "/me")):
        return None
    return auth.current(request, s)


router = APIRouter(prefix="/api", tags=["report-studio"], dependencies=[Depends(guard)])


class Login(BaseModel):
    name: str
    password: str


class NewUser(BaseModel):
    name: str
    password: str
    role: str = "lider"
    sections: list[str] = []


@router.post("/login")
def login(body: Login, s: Store = Depends(get_store)):
    u = s.get_user(body.name.strip())
    if not u or not auth.check_pw(body.password, u["pw"]):
        raise HTTPException(401, "Usuario o contraseña incorrectos")
    r = JSONResponse({"name": u["name"], "role": u["role"], "sections": u["sections"]})
    r.set_cookie("rs_token", auth.make_token(u["name"]), max_age=auth.TTL, httponly=True, samesite="lax")
    return r


@router.post("/logout")
def logout():
    r = JSONResponse({"ok": True})
    r.delete_cookie("rs_token")
    return r


@router.get("/me")
def me(request: Request, s: Store = Depends(get_store)):
    if s.count_users() == 0:
        return {"open": True, "name": "", "role": "admin", "sections": []}
    u = s.get_user(auth.read_token(request.cookies.get("rs_token")) or "")
    if not u:
        raise HTTPException(401, "Ingresa con tu usuario")
    return {"open": False, "name": u["name"], "role": u["role"], "sections": u["sections"]}


@router.get("/users")
def users(user=Depends(guard), s: Store = Depends(get_store)):
    auth.require_admin(user)
    return s.list_users()


@router.post("/users", status_code=201)
def add_user(body: NewUser, user=Depends(guard), s: Store = Depends(get_store)):
    auth.require_admin(user)
    if body.role not in ("admin", "lider") or len(body.password) < 6 or not body.name.strip():
        raise HTTPException(422, "Nombre, rol (admin o lider) y contraseña de mínimo 6 caracteres")
    if s.count_users() == 0:
        body.role = "admin"  # el primero siempre es administrador
    s.put_user(body.name.strip(), auth.hash_pw(body.password), body.role, body.sections)
    return {"ok": True}


@router.delete("/users/{name}", status_code=204)
def del_user(name: str, user=Depends(guard), s: Store = Depends(get_store)):
    auth.require_admin(user)
    if user and user["name"] == name:
        raise HTTPException(422, "No puedes borrarte a ti mismo")
    s.del_user(name)
    return Response(status_code=204)


class TplIn(BaseModel):
    name: str
    section: dict[str, Any]


def _tpl_section(sec: dict) -> dict:
    from .schema import Section
    try:
        m = Section.model_validate({"id": "plantilla", **{k: v for k, v in sec.items() if k not in ("id", "home")}})
    except Exception as e:  # noqa: BLE001
        raise HTTPException(422, {"message": "La plantilla no es válida", "issues": [str(e)[:400]]})
    return m.model_dump(mode="json", exclude_none=True, exclude={"id", "home"})


@router.get("/templates")
def templates(user=Depends(guard), s: Store = Depends(get_store)):
    from .templates_lib import BUILTIN
    return [{**b, "builtin": True} for b in BUILTIN] + [{**t, "builtin": False} for t in s.list_templates()]


@router.post("/templates", status_code=201)
def add_template(body: TplIn, user=Depends(guard), s: Store = Depends(get_store)):
    auth.require_admin(user)
    if not body.name.strip():
        raise HTTPException(422, "Ponle nombre a la plantilla")
    return {"id": s.put_template(body.name.strip(), _tpl_section(body.section))}


@router.delete("/templates/{tid}", status_code=204)
def del_template(tid: int, user=Depends(guard), s: Store = Depends(get_store)):
    auth.require_admin(user)
    s.del_template(tid)
    return Response(status_code=204)


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


_MEDIA_ANY = re.compile(r'/media/([A-Za-z0-9_.-]+)')


@router.get("/starters")
def starters():
    from .starters import STARTERS
    return [{"id": x["id"], "name": x["name"], "desc": x["desc"]} for x in STARTERS]


@router.post("/reports/from-starter/{sid}", status_code=201)
def report_from_starter(sid: str, user=Depends(guard), s: Store = Depends(get_store)):
    """Crea un informe nuevo desde un punto de partida en blanco (sin textos de ninguna área)."""
    from .starters import STARTERS
    auth.require_admin(user)
    st = next((x for x in STARTERS if x["id"] == sid), None)
    if not st:
        raise HTTPException(404, "No existe ese punto de partida")
    rep = _valid(st["data"])
    rid = s.create(rep.model_dump(mode="json"), "Versión inicial")
    return s.get(rid)


@router.get("/reports/{rid}/export.rsz")
def export_pack(rid: int, s: Store = Depends(get_store)):
    """Paquete para llevar el informe a otro computador: el JSON y las imágenes/videos que usa."""
    r = _get(s, rid)
    txt = json.dumps(r["data"], ensure_ascii=False, indent=1)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("report.json", txt)
        for n in sorted(set(_MEDIA_ANY.findall(txt))):
            f = MEDIA_DIR / n
            if f.is_file():
                z.write(f, "media/" + n)
    return Response(buf.getvalue(), media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="informe-{rid}.rsz"'})


@router.post("/reports/import", status_code=201)
async def import_pack(file: UploadFile = File(...), user=Depends(guard), s: Store = Depends(get_store)):
    """Acepta un .rsz (paquete) o un .json suelto. Copia los medios y crea el informe como uno nuevo."""
    auth.require_admin(user)
    raw = await file.read()
    if raw[:2] == b"PK":
        try:
            z = zipfile.ZipFile(io.BytesIO(raw))
            data = json.loads(z.read("report.json"))
        except Exception:
            raise HTTPException(400, "El paquete no es válido: falta report.json")
        MEDIA_DIR.mkdir(parents=True, exist_ok=True)
        for n in z.namelist():
            base = Path(n).name
            if n.startswith("media/") and Path(base).suffix.lower() in OK_EXT and re.fullmatch(r"[A-Za-z0-9_.-]+", base) and not (MEDIA_DIR / base).exists():
                (MEDIA_DIR / base).write_bytes(z.read(n))
    else:
        try:
            data = json.loads(raw.decode("utf-8"))
        except Exception:
            raise HTTPException(400, "El archivo no es un JSON ni un paquete .rsz")
    rep = _valid(data)
    rid = s.create(rep.model_dump(mode="json"), "Importado")
    return s.get(rid)


@router.post("/reports", status_code=201)
def create_report(body: Save, user=Depends(guard), s: Store = Depends(get_store)):
    auth.require_admin(user)
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
def update_report(rid: int, body: Save, user=Depends(guard), s: Store = Depends(get_store)):
    old = _get(s, rid)
    rep = _valid(body.data)
    auth.check_leader_edit(user, old["data"], rep.model_dump(mode="json"))
    s.update(rid, rep.model_dump(mode="json"), body.note)
    return s.get(rid)


@router.delete("/reports/{rid}", status_code=204)
def delete_report(rid: int, user=Depends(guard), s: Store = Depends(get_store)):
    auth.require_admin(user)
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
def restore(rid: int, n: int, user=Depends(guard), s: Store = Depends(get_store)):
    auth.require_admin(user)
    d = s.version_data(rid, n)
    if d is None:
        raise HTTPException(404, "Versión no encontrada")
    s.update(rid, d, f"Restaurada la versión {n}")
    return s.get(rid)


def _html(s: Store, rid: int, embed: bool = False) -> str:
    h = render(_valid(_get(s, rid)["data"]))
    return embed_media(h) if embed else h


class UrlBody(BaseModel):
    url: str


_MIME_EXT = {"image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg",
             "video/mp4": ".mp4", "video/webm": ".webm", "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/ogg": ".ogg", "audio/mp4": ".m4a"}


def _public_host(host: str) -> bool:
    import ipaddress, socket
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError:
        return False
    for i in infos:
        ip = ipaddress.ip_address(i[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    return True


@router.post("/media/url")
def media_from_url(body: UrlBody):
    """Descarga una imagen/video/audio de internet y la guarda en el servidor, para que el informe no dependa del enlace."""
    import urllib.request, urllib.error
    from urllib.parse import urlparse
    u = body.url.strip()
    pu = urlparse(u)
    if pu.scheme not in ("http", "https") or not pu.hostname:
        raise HTTPException(400, "El enlace debe empezar por http:// o https://")
    if not _public_host(pu.hostname):
        raise HTTPException(400, "Ese enlace apunta a una dirección interna y no se puede descargar")

    class Safe(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            h = urlparse(newurl).hostname
            if not h or not _public_host(h):
                raise urllib.error.URLError("redirección a una dirección interna")
            return super().redirect_request(req, fp, code, msg, headers, newurl)
    op = urllib.request.build_opener(Safe)
    try:
        with op.open(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 ReportStudio"}), timeout=25) as r:
            ct = (r.headers.get_content_type() or "").lower()
            data = r.read(100 * 1024 * 1024 + 1)
    except Exception as e:
        raise HTTPException(502, f"No pude descargar el enlace: {str(e)[:120]}")
    if len(data) > 100 * 1024 * 1024:
        raise HTTPException(413, "El archivo supera 100 MB")
    ext = _MIME_EXT.get(ct) or Path(pu.path).suffix.lower()
    if ext not in OK_EXT:
        raise HTTPException(415, f"El enlace no es una imagen, video o audio permitido ({ct or 'tipo desconocido'})")
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex[:12]}{ext}"
    (MEDIA_DIR / name).write_bytes(data)
    return {"url": f"/media/{name}", "name": name, "size": len(data)}


_MEDIA_RE = re.compile(r'(?<=["\'(])/media/([A-Za-z0-9_.-]+)(?=["\')])')


def embed_media(html: str) -> str:
    """Reemplaza /media/<archivo> por data URI (en atributos, estilos y datos) para que el HTML exportado sea un solo archivo."""
    cache: dict[str, str] = {}

    def sub(m):
        n = m.group(1)
        if n not in cache:
            f = MEDIA_DIR / n
            if not f.is_file():
                cache[n] = m.group(0)
            else:
                mime = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
                cache[n] = f"data:{mime};base64,{base64.b64encode(f.read_bytes()).decode()}"
        return cache[n]
    return _MEDIA_RE.sub(sub, html)


@router.get("/reports/{rid}/preview", response_class=HTMLResponse)
def preview(rid: int, s: Store = Depends(get_store)):
    return HTMLResponse(_html(s, rid))


@router.post("/render", response_class=HTMLResponse)
def render_draft(body: dict[str, Any] = Body(...), edit: bool = False):
    """Vista previa de un borrador sin guardarlo. edit=1 marca las casillas para edición directa."""
    rep, _issues = load(body)  # el borrador se dibuja aunque tenga avisos; los avisos se ven en el editor
    if rep is None:
        raise HTTPException(422, {"message": "El informe tiene errores", "issues": _issues})
    return HTMLResponse(render(rep, edit=edit))


@router.get("/reports/{rid}/export.html")
def export_html(rid: int, s: Store = Depends(get_store)):
    return Response(_html(s, rid, embed=True), media_type="text/html; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="informe-{rid}.html"'})


@router.get("/reports/{rid}/export.pptx")
def export_pptx(rid: int, s: Store = Depends(get_store)):
    from .pptx_export import to_pptx
    rep = _valid(_get(s, rid)["data"])
    return Response(to_pptx(rep), media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    headers={"Content-Disposition": f'attachment; filename="informe-{rid}.pptx"'})


@router.get("/reports/{rid}/export.pdf")
def export_pdf(rid: int, s: Store = Depends(get_store)):
    html = _html(s, rid, embed=True)
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


@router.get("/texts")
def fixed_texts():
    """Rótulos fijos de las casillas especiales, con su texto original, para poder cambiarlos."""
    from .render import TEXTS
    return [{"key": k, "default": v[0], "group": v[1]} for k, v in TEXTS.items()]


@router.get("/ingest/status")
def ingest_status():
    return {"engine": llm.engine(), "formats": sorted(ingest.EXT)}


@router.post("/ingest/extract")
async def ingest_extract(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ingest.EXT:
        raise HTTPException(415, f"Formato no soportado: {ext or 'sin extensión'}. Usa PDF, Word, PPT, Excel, HTML o texto.")
    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(413, "El archivo supera 50 MB")
    rep = ingest.embedded_report(file.filename or "", data)
    if rep is not None:
        return {"name": file.filename, "report": rep, "text": ""}
    try:
        text = ingest.extract_text(file.filename or "", data)
    except Exception as e:
        raise HTTPException(422, f"No se pudo leer el archivo: {type(e).__name__}: {str(e)[:160]}")
    return {"name": file.filename, "report": None, "text": text}


@router.post("/ingest/propose")
def ingest_propose(body: dict[str, Any] = Body(...)):
    text = str(body.get("text", "")).strip()
    if len(text) < 10:
        raise HTTPException(400, "No hay texto para analizar")
    try:
        return ingest.propose(text, str(body.get("hint", "")))
    except Exception as e:
        raise HTTPException(502, f"El motor de IA falló: {type(e).__name__}: {str(e)[:200]}")


MEDIA_DIR = Path(os.environ.get("RS_MEDIA", "data/media"))
OK_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".mp4", ".webm", ".mov", ".mp3", ".wav", ".m4a", ".ogg"}


@router.post("/media")
async def upload(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in OK_EXT:
        raise HTTPException(415, f"Formato no permitido: {ext or 'sin extensión'}")
    data = await file.read()
    if len(data) > 200 * 1024 * 1024:
        raise HTTPException(413, "El archivo supera 200 MB")
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex[:12]}{ext}"
    (MEDIA_DIR / name).write_bytes(data)
    return {"url": f"/media/{name}", "name": name, "size": len(data)}


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

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
    dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if dist.is_dir():  # la interfaz compilada se sirve desde el mismo servidor
        app.mount("/", StaticFiles(directory=dist, html=True), name="ui")
    return app


app = create_app()
