"""Validación del informe: el esquema (tipos) más reglas entre bloques."""
from __future__ import annotations

from typing import Iterator

from pydantic import ValidationError

from .schema import (Activities, Block, Budget, CalendarBlock, Grid, Report)


def walk(blocks: list) -> Iterator:
    for b in blocks:
        yield b
        if isinstance(b, Grid):
            for col in b.columns:
                yield from walk(col)


def all_blocks(rep: Report) -> Iterator:
    for s in rep.sections:
        yield from walk(s.blocks)
        for t in s.tabs:
            yield from walk(t.blocks)


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
