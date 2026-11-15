"""Validación del informe: el esquema (tipos) más reglas entre bloques."""
from __future__ import annotations

from typing import Iterator

from pydantic import ValidationError

from datetime import date

from .schema import (Activities, Block, Budget, CalendarBlock, Chart, Grid, Group, Report)


def walk(blocks: list) -> Iterator:
    for b in blocks:
        yield b
        if isinstance(b, Grid):
            for col in b.columns:
                yield from walk(col)
        elif isinstance(b, Group):
            yield from walk(b.blocks)


def all_blocks(rep: Report) -> Iterator:
    for s in rep.sections:
        yield from walk(s.blocks)
        for t in s.tabs:
            yield from walk(t.blocks)


def _d(s: str):
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def check_chart(c: Chart) -> list[str]:
    n, k, w = len(c.labels), c.kind, f"Gráfico «{c.title or c.id or c.kind}»"
    out: list[str] = []
    if k in ("scatter", "bubble"):
        if not any(s.points for s in c.series):
            out.append(f"{w}: agrega puntos (x, y) a una serie.")
    elif k == "candles":
        s = c.series[0] if c.series else None
        if not s or not s.ohlc or len(s.ohlc) != n:
            out.append(f"{w}: las velas necesitan una serie con [apertura, máximo, mínimo, cierre] por cada etiqueta ({n}).")
        elif any(len(x) != 4 or x[1] < max(x[0], x[3]) or x[2] > min(x[0], x[3]) for x in s.ohlc):
            out.append(f"{w}: en cada vela el máximo debe ser el mayor y el mínimo el menor.")
    elif k == "sankey":
        if not c.links:
            out.append(f"{w}: agrega al menos un flujo (origen → destino).")
        for l in c.links:
            if l.source == l.target or l.value <= 0:
                out.append(f"{w}: el flujo «{l.source} → {l.target}» debe tener nodos distintos y valor positivo.")
        nodes = {x for l in c.links for x in (l.source, l.target)}
        depth = {x: 0 for x in nodes}
        for _ in range(len(nodes) + 1):
            for l in c.links:
                depth[l.target] = max(depth[l.target], depth[l.source] + 1)
        if any(v > len(nodes) for v in depth.values()):
            out.append(f"{w}: los flujos forman un ciclo; deben ir siempre hacia adelante.")
    elif k == "histogram":
        if not c.series or len(c.series[0].values) < 2:
            out.append(f"{w}: el histograma necesita al menos 2 valores.")
        if c.bins < 0 or c.bins > 40:
            out.append(f"{w}: los intervalos deben estar entre 0 y 40.")
    elif k == "kpi":
        if not c.series or not all(s.values for s in c.series):
            out.append(f"{w}: cada indicador necesita al menos un valor.")
    elif k == "calendar":
        if not c.events:
            out.append(f"{w}: agrega al menos un evento con fecha.")
        for e in c.events:
            if _d(e.start) is None:
                out.append(f"{w}: la fecha de «{e.label}» debe ser AAAA-MM-DD.")
    elif k in ("timeline", "gantt"):
        if not c.events:
            out.append(f"{w}: agrega al menos un evento.")
        for e in c.events:
            a, b = _d(e.start), _d(e.end) if e.end else None
            if a is None or (e.end and b is None):
                out.append(f"{w}: la fecha de «{e.label}» debe ser AAAA-MM-DD.")
            elif b and b < a:
                out.append(f"{w}: «{e.label}» termina antes de empezar.")
            if k == "gantt" and not e.end:
                out.append(f"{w}: «{e.label}» necesita fecha de fin en el cronograma.")
    else:
        if not c.series or not any(s.values for s in c.series):
            out.append(f"{w}: agrega al menos una serie con valores.")
        n = n if k not in ("histogram", "kpi") else 0
        for s in c.series:
            if k != "gauge" and s.values and len(s.values) != n:
                out.append(f"{w}: la serie «{s.name}» tiene {len(s.values)} valores y hay {n} etiquetas.")
        if k == "bullet" and c.target and len(c.target) != n:
            out.append(f"{w}: las metas deben ser {n}, una por etiqueta.")
        if k == "waterfall" and any(i < 0 or i >= n for i in c.totals):
            out.append(f"{w}: hay totales fuera del rango de etiquetas.")
        if k in ("pie", "donut", "funnel", "treemap", "radialbar", "waffle", "pictogram", "hemicycle", "rose", "pareto") and any(v < 0 for s in c.series[:1] for v in s.values):
            out.append(f"{w}: este tipo de gráfico no admite valores negativos.")
        if k == "radar" and n < 3:
            out.append(f"{w}: el radar necesita al menos 3 etiquetas.")
        if k == "pyramid" and len(c.series) != 2:
            out.append(f"{w}: la pirámide necesita exactamente 2 series (izquierda y derecha).")
        if k == "dumbbell" and len(c.series) < 2:
            out.append(f"{w}: las mancuernas necesitan 2 series (antes y después).")
        if k == "slope" and n != 2:
            out.append(f"{w}: la pendiente compara exactamente 2 momentos (2 etiquetas).")
        if k == "bump" and (len(c.series) < 2 or n < 2):
            out.append(f"{w}: el ranking necesita 2 o más series y 2 o más periodos.")
    return out


def check(rep: Report) -> list[str]:
    """Devuelve problemas de coherencia (lista vacía = todo bien)."""
    out: list[str] = []
    ids = [s.id for s in rep.sections]
    if len(ids) != len(set(ids)):
        out.append("Hay secciones con id repetido.")
    blocks = list(all_blocks(rep))
    bid = [b.id for b in blocks if b.id]
    if len(bid) != len(set(bid)):
        out.append("Hay bloques con id repetido.")
    acts = {b.id for b in blocks if isinstance(b, Activities) and b.id}
    for b in blocks:
        if isinstance(b, (Budget, CalendarBlock)) and b.source not in acts:
            out.append(f"El bloque '{b.type}' apunta a '{b.source}', que no es un bloque de actividades.")
    for b in blocks:
        if isinstance(b, Chart):
            out += check_chart(b)
    for a in rep.alerts:
        if a.group not in ids:
            out.append(f"Alerta con grupo '{a.group}' que no existe como sección.")
    for s in rep.sections:
        if s.blocks and s.tabs:
            out.append(f"La sección '{s.id}' tiene bloques y pestañas a la vez; usa una de las dos.")
    return out


def load(data: dict) -> tuple[Report | None, list[str]]:
    try:
        rep = Report.model_validate(data)
    except ValidationError as e:
        return None, [f"{'.'.join(map(str, x['loc']))}: {x['msg']}" for x in e.errors()]
    return rep, check(rep)
