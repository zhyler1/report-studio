"""Carga de datos desde documentos (PDF, Word, PPT, HTML, texto) y propuesta de casillas."""
from __future__ import annotations

import io
import json
import os
import re
from pathlib import Path

from pydantic import TypeAdapter, ValidationError

from . import llm
from .schema import Block, Chart
from .validate import check_chart

EXT = {".pdf", ".docx", ".pptx", ".txt", ".md", ".csv", ".html", ".htm", ".xlsx"}


def _tsv(rows) -> str:
    return "\n".join("\t".join((c or "").replace("\n", " ").strip() for c in r) for r in rows if any(c for c in r))


def _ocr_page(data: bytes, idx: int) -> str:
    """OCR local (Tesseract) para páginas sin texto. Sin Tesseract instalado devuelve vacío."""
    if os.environ.get("RS_OCR", "1") == "0":
        return ""
    try:
        import pypdfium2 as pdfium
        import pytesseract
        img = pdfium.PdfDocument(data)[idx].render(scale=4).to_pil()
        try:
            langs = set(pytesseract.get_languages())
            lang = "spa+eng" if {"spa", "eng"} <= langs else "eng"
        except Exception:
            lang = "eng"
        t = pytesseract.image_to_string(img, lang=lang, config="--psm 6")
        return t if len(t.strip()) > 10 else ""
    except Exception:
        return ""


def extract_text(name: str, data: bytes) -> str:
    ext = Path(name).suffix.lower()
    if ext == ".pdf":
        import pdfplumber
        out = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for i, pg in enumerate(pdf.pages, 1):
                out.append(f"--- Página {i} ---")
                txt = pg.extract_text() or ""
                tabs = pg.extract_tables() or []
                if len(txt.strip()) < 30 and not tabs and pg.images:
                    txt = _ocr_page(data, i - 1)  # página que es solo imagen
                out.append(txt)
                for t in tabs:
                    out.append("[TABLA]\n" + _tsv(t) + "\n[/TABLA]")
        return "\n".join(out)
    if ext == ".docx":
        import docx
        d = docx.Document(io.BytesIO(data))
        out = [p.text for p in d.paragraphs if p.text.strip()]
        for t in d.tables:
            out.append("[TABLA]\n" + _tsv([[c.text for c in r.cells] for r in t.rows]) + "\n[/TABLA]")
        return "\n".join(out)
    if ext == ".pptx":
        from pptx import Presentation
        out = []
        for i, s in enumerate(Presentation(io.BytesIO(data)).slides, 1):
            out.append(f"--- Diapositiva {i} ---")
            for sh in s.shapes:
                if sh.has_text_frame and sh.text_frame.text.strip():
                    out.append(sh.text_frame.text)
                if getattr(sh, "has_table", False) and sh.has_table:
                    out.append("[TABLA]\n" + _tsv([[c.text for c in r.cells] for r in sh.table.rows]) + "\n[/TABLA]")
        return "\n".join(out)
    if ext == ".xlsx":
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
        return "\n".join(f"--- Hoja {ws.title} ---\n[TABLA]\n" + _tsv([[("" if c is None else str(c)) for c in r] for r in ws.iter_rows(values_only=True)]) + "\n[/TABLA]" for ws in wb)
    txt = data.decode("utf-8", errors="replace") if ext != ".csv" else data.decode("utf-8", errors="replace")
    if ext in (".html", ".htm"):
        from bs4 import BeautifulSoup
        s = BeautifulSoup(txt, "lxml")
        for x in s(["script", "style", "noscript"]):
            x.decompose()
        return re.sub(r"\n{3,}", "\n\n", s.get_text("\n"))
    return txt


def embedded_report(name: str, data: bytes) -> dict | None:
    """Si el HTML fue exportado por Report Studio, trae el informe completo incrustado."""
    if Path(name).suffix.lower() not in (".html", ".htm"):
        return None
    m = re.search(rb'<script type="application/json" id="rs-report">(.*?)</script>', data, re.S)
    if not m:  # informe HTML escrito a mano (la plantilla original): se reconstruye desde su estructura y sus datos
        from .legacy import from_html
        html = data.decode("utf-8", "ignore")
        w = re.search(r"var TPL='([A-Za-z0-9+/=]{200,})'", html)  # el "Administrador" trae la plantilla en base64
        if w:
            import base64
            html = base64.b64decode(w.group(1)).decode("utf-8", "ignore")
        return from_html(html)
    try:
        return json.loads(m.group(1).decode("utf-8").replace("<\\/", "</"))
    except ValueError:
        return None


# ───────────── lectura básica (sin IA) ─────────────
# Encabezados de la guía de la reunión → estilo de lista
GUIA = [
    (r"(?:seguimiento\s+(?:a\s+)?(?:las?\s+)?)?(?:alertas?\s+(?:nuevas?|emergentes?)|riesgos?|alertas?)", "warn", "Alertas y riesgos"),
    (r"requerimientos?|decisiones|apoyo requerido|necesidades", "warn", "Requerimientos y decisiones"),
    (r"compromisos?|pr[oó]ximos?|pendientes? prioritarios?", "checks", "Compromisos próximos"),
    (r"logros?|resultados?|avances?|estado general|acciones? de gesti[oó]n|procesos generales", "checks", "Estado general y logros"),
]


def _guide_blocks(plain: str) -> list[dict]:
    """Parte el texto por encabezados de la guía (líneas cortas, en mayúsculas o que coinciden con la guía)."""
    cur, sections = None, []
    for raw in plain.split("\n"):
        l = raw.strip()
        if not l or l.startswith("---"):
            continue
        head = None
        if len(l) <= 60 and (l.isupper() or re.match(r"^\d+[.)]?\s+\S", l) is None):
            for rx, st, name in GUIA:
                if (re.match(rf"(?i)\W*({rx})\b", l) if l.isupper() else re.fullmatch(rf"(?i)\W*({rx})(\s+[\wáéíóúñ]+){{0,3}}\W*", l)):
                    head = (name, st, l)
                    break
        if head:
            cur = {"title": head[2].title() if head[2].isupper() else head[2], "style": head[1], "items": []}
            sections.append(cur)
        elif cur is not None and len(l) > 25 and not re.match(r"^\s*[^:\d]{4,80}?\s*[:\-–]\s*(\$?\s*[\d.,]+\s*%?)\s*$", l):   # las líneas «Nombre: valor» ya van a las cifras destacadas
            cur["items"].append(re.sub(r"^\s*[-•*▪●·]\s*|^\s*\d+[.)]\s+", "", l))
    return [{"type": "card_list", "title": c["title"], "style": c["style"], "items": c["items"][:30]} for c in sections if len(c["items"]) >= 1]


def _noisy(rows: list[list[str]]) -> bool:
    """Tablas casi vacías o de una sola celda con todo el texto: son diseño de la diapositiva, no datos."""
    cells = [c for r in rows for c in r]
    return not cells or sum(1 for c in cells if c.strip()) / len(cells) < 0.45


def basic_blocks(text: str) -> list[dict]:
    blocks: list[dict] = []
    for m in re.finditer(r"\[TABLA\]\n(.*?)\n\[/TABLA\]", text, re.S):
        rows = [r.split("\t") for r in m.group(1).split("\n") if r.strip()]
        if len(rows) < 2 or max(len(r) for r in rows) < 2 or _noisy(rows):
            continue
        w = max(len(r) for r in rows)
        cols = [{"key": f"c{i}", "label": (rows[0][i] if i < len(rows[0]) and rows[0][i] else f"Columna {i + 1}"), "format": "text"} for i in range(w)]
        body = [{f"c{i}": (r[i] if i < len(r) else "") for i in range(w)} for r in rows[1:]]
        blocks.append({"type": "table", "title": "Tabla importada", "columns": cols, "rows": body})
    plain = re.sub(r"\[TABLA\].*?\[/TABLA\]", "", text, flags=re.S)
    bullets = [re.sub(r"^\s*[-•*▪●·]\s*|^\s*\d+[.)]\s+", "", l).strip() for l in plain.split("\n") if re.match(r"^\s*([-•*▪●·]|\d+[.)])\s+\S", l)]
    stats = []
    for l in plain.split("\n"):
        m = re.match(r"^\s*([^:\d]{4,80}?)\s*[:\-–]\s*(\$?\s*[\d.,]+\s*%?)\s*$", l)
        if m:
            stats.append({"label": m.group(1).strip(), "value": m.group(2).strip()})
    if stats:
        blocks.insert(0, {"type": "stat_grid", "items": stats[:8]})
    guide = _guide_blocks(plain)
    if len(guide) >= 2:
        blocks.extend(guide)
    elif bullets:
        blocks.append({"type": "card_list", "title": "Puntos del documento", "style": "plain", "items": bullets[:40]})
    if not blocks:
        paras = [p.strip() for p in re.split(r"\n\s*\n", plain) if len(p.strip()) > 20]
        if paras:
            blocks.append({"type": "note_list", "header": "TEXTO IMPORTADO", "items": paras[:20]})
    return blocks


# ───────────── propuesta con IA ─────────────
SYSTEM = """Eres un asistente que convierte documentos de una oficina de Talento Humano (Presidencia de Colombia) en casillas para un informe interactivo.
Responde SOLO con un objeto JSON {"blocks":[...]} sin texto adicional. Reglas:
- Usa únicamente datos que estén en el documento. No inventes cifras, fechas ni nombres. Copia las cifras tal cual.
- Escribe en español, con el tono institucional del documento.
- Elige el tipo de casilla que mejor represente cada parte (máximo 12 casillas):
  {"type":"stat_grid","title":null,"items":[{"value":"159","label":"descripción de la cifra","prefix":"","suffix":""}]}  (cifras destacadas, hasta 8)
  {"type":"card_list","title":"...","style":"plain|checks|warn","items":["texto con **negrita** opcional"]}  (listas; warn para riesgos)
  {"type":"note_list","header":"OBSERVACIONES","items":["..."]}
  {"type":"row_list","header":"...","items":[{"n":1,"title":"...","text":"...","evidence":"..."}]}  (acciones con evidencia)
  {"type":"table","title":"...","columns":[{"key":"a","label":"...","format":"text|money|number|pct|pill"}],"rows":[{"a":"..."}]}
  {"type":"chart","title":"...","kind":"bar|hbar|line|pie|donut|stacked|area|kpi","labels":["..."],"series":[{"name":"...","values":[1,2]}],"unit":""}
    (solo si el documento trae series numéricas comparables; cada serie con tantos valores como etiquetas)
- Las tablas del documento aparecen entre [TABLA] y [/TABLA] con columnas separadas por tabulador.
- Si algo no encaja, déjalo fuera antes que inventarlo."""


def _json_from(s: str) -> dict:
    s = s.strip()
    s = re.sub(r"^```(?:json)?|```$", "", s, flags=re.M).strip()
    i, j = s.find("{"), s.rfind("}")
    return json.loads(s[i:j + 1])


def propose(text: str, hint: str = "") -> dict:
    eng = llm.engine()
    if not eng:
        return {"engine": None, "blocks": _validate(basic_blocks(text))[0], "issues": ["Sin motor de IA configurado: lectura básica (tablas, listas y cifras sueltas)."]}
    user = (f"Contexto adicional: {hint}\n\n" if hint else "") + "DOCUMENTO:\n" + text[:60000]
    raw = llm.complete(SYSTEM, user)
    try:
        items = _json_from(raw).get("blocks", [])
    except ValueError:
        return {"engine": eng, "blocks": [], "issues": ["La IA no devolvió un JSON válido; intenta de nuevo o usa texto más corto."]}
    blocks, issues = _validate(items)
    return {"engine": eng, "blocks": blocks, "issues": issues}


_TA = TypeAdapter(Block)


def _validate(items: list[dict]) -> tuple[list[dict], list[str]]:
    ok, issues = [], []
    for i, b in enumerate(items, 1):
        try:
            m = _TA.validate_python(b)
            if isinstance(m, Chart):
                p = check_chart(m)
                if p:
                    issues.append(f"Casilla {i} (gráfico) descartada: {p[0]}")
                    continue
            ok.append(m.model_dump(mode="json"))
        except ValidationError as e:
            issues.append(f"Casilla {i} descartada: {e.errors()[0]['msg']}")
    return ok, issues
