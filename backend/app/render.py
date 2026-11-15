"""Renderizador: Report (JSON validado) -> HTML de un solo archivo.

El HTML sale del *shell* (CSS + JS de la plantilla visual) más los paneles que dibuja este módulo.
Los datos dinámicos (tablas, calendario, alertas, planta transitoria...) los pinta el JS del shell
a partir de arreglos JSON que se inyectan aquí en los marcadores /*@BIEN*/ ... /*@/BIEN*/.
"""
from __future__ import annotations

import html as _html
import json
import re
from pathlib import Path

from .schema import (Activities, Agreement, Budget, CalendarBlock, CardList, Chart, Gallery, Grid, LinkCards, Media, MediaBlock,
                     NoteList, NumberedCards, Plants, Proposals, Report, RingCard, RowList, Section, StatGrid, StatusList,
                     StepCards, Table, Workflow)

SHELL = Path(__file__).parent / "templates" / "shell.html"
GREEN, YEL, ORG, RED = "g", "y", "o", "r"
CLS = {"green": "g", "yellow": "y", "orange": "o", "red": "r"}
VAR = {"red": "var(--red)", "yellow": "var(--yellow)", "blue": "var(--blue)", "green": "var(--green2)", "orange": "var(--org)",
       "purple": "#8E63C8", "navy": "var(--navy)", "auto": "var(--head)"}


def esc(s) -> str:
    return _html.escape(str(s), quote=False)


def attr(s) -> str:
    return _html.escape(str(s), quote=True)


def rich(s: str) -> str:
    t = esc(s)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t, flags=re.S)
    return t.replace("\n", "<br>")


def fmt(n) -> str:
    return f"{int(n):,}".replace(",", ".")


def money_int(s: str) -> int:
    s = str(s or "")
    s = s.split(",")[0]
    d = re.sub(r"\D", "", s)
    return int(d) if d else 0


def semc(p, th=(90, 80, 50)) -> str:
    p = float(p)
    return GREEN if p >= th[0] else YEL if p >= th[1] else ORG if p >= th[2] else RED


def num_text(v, prefix="", suffix="") -> str:
    return f"{prefix}{fmt(v)}{suffix}" if isinstance(v, (int, float)) else f"{prefix}{v}{suffix}"


# Rótulos fijos de las casillas especiales (clave → (texto original, grupo)). Cada uno se puede cambiar con doble clic o en Datos → Textos fijos.
TEXTS = {
    "per.prov": ("Provistos", "Planta"), "per.vac": ("Vacantes", "Planta"), "per.logro": ("Logro destacado:", "Planta"),
    "hero.planta": ("Planta permanente", "Inicio"), "hero.pos": ("Posesiones realizadas", "Inicio"),
    "wf.titulo": ("Planta transitoria", "Inicio"), "wf.texto": ("Flujo de trabajo para la prórroga de la planta transitoria.", "Inicio"),
    "wf.ejecutado": ("ejecutado", "Flujo de trabajo"), "wf.proceso": ("en proceso", "Flujo de trabajo"), "wf.espera": ("en espera", "Flujo de trabajo"),
    "pres.presupuesto": ("Presupuesto", "Presupuesto"), "pres.excede": ("Excede el presupuesto (cálculo)", "Presupuesto"),
    "pres.dif": ("Diferencia frente al presupuesto (cálculo)", "Presupuesto"), "pres.pend": ("Actividades pendientes ({n} con valor, {m} sin costo)", "Presupuesto"),
    "pres.frente": (" frente al presupuesto", "Presupuesto"), "pres.del": ("del presupuesto", "Presupuesto"),
    "pres.desglose": ("Desglose por actividad (valor pendiente)", "Presupuesto"), "pres.sinvalor": ("Aún no hay actividades con valor.", "Presupuesto"),
    "pres.resto": ("Sin desglosar por actividad (cálculo)", "Presupuesto"),
    "acu.resultado": ("Resultado General", "Acuerdo"), "acu.hito": ("Próximo Hito Estratégico", "Acuerdo"), "acu.estado": ("Estado de los Compromisos Priorizados", "Acuerdo"),
    "acu.numeral": ("Numeral", "Acuerdo"), "acu.col_estado": ("Estado", "Acuerdo"), "acu.situacion": ("Situación actual", "Acuerdo"),
    "acu.avances": ("Principales Avances Alcanzados", "Acuerdo"), "acu.aspectos": ("Aspectos que Requieren Seguimiento", "Acuerdo"),
    "act.h_medida": ("Medida", "Actividades"), "act.h_actividad": ("Actividad", "Actividades"), "act.h_period": ("Periodicidad", "Actividades"),
    "act.h_pct": ("% Cumplimiento", "Actividades"), "act.h_fecha": ("Fecha de realización", "Actividades"), "act.h_obs": ("Observación", "Actividades"), "act.h_valor": ("Valor", "Actividades"),
    "act.buscar": ("Buscar actividad, medida u observación…", "Actividades"), "act.f_todas": ("Todas", "Actividades"), "act.f_cero": ("0% de cumplimiento", "Actividades"), "act.f_val": ("Con valor", "Actividades"),
    "act.g1": ("ACUERDO SINDICAL", "Actividades"), "act.g2": ("MEDIDAS EFR", "Actividades"), "act.total": ("TOTAL", "Actividades"), "act.presupuesto": ("PRESUPUESTO", "Actividades"),
    "act.sinres": ("Sin resultados para este filtro.", "Actividades"),
    "cal.sinfecha": ("Sin fecha definida:", "Calendario"), "cal.clic": ("Haz clic en una actividad para ver su detalle.", "Calendario"),
    "cal.ninguna": ("Ninguna actividad tiene una fecha que se pueda ubicar en el calendario.", "Calendario"),
    "th.rangos": ("Rangos", "Tablas de propuestas"), "th.dias": ("Días", "Tablas de propuestas"), "th.actividad": ("Actividad", "Tablas de propuestas"),
    "th.cuposaprox": ("Cupos aprox.", "Tablas de propuestas"), "th.valoraprox": ("Valor aprox.", "Tablas de propuestas"), "th.bonos": ("Bonos", "Tablas de propuestas"),
    "th.cantidad": ("Cantidad", "Tablas de propuestas"), "th.valorunitario": ("Valor unitario", "Tablas de propuestas"), "th.valortotal": ("Valor total", "Tablas de propuestas"),
    "th.opcion": ("Opción", "Tablas de propuestas"), "tbl.vacio": ("Sin valores por ahora", "Tablas de propuestas"),
}


def T(ctx, k: str) -> str:
    """Rótulo fijo con su posible cambio; en modo edición queda marcado para editarlo con doble clic."""
    v = ctx.rep.meta.texts.get(k) or TEXTS[k][0]
    return f'<span data-tx="{k}">{esc(v)}</span>' if ctx.edit else esc(v)


class Ctx:
    def __init__(self, rep: Report, edit: bool = False):
        self.rep = rep
        self.edit = edit
        self.path = ""
        self.th = tuple(rep.meta.thresholds)
        self.acts = {}
        self.plants = None
        for s in rep.sections:
            for b in _blocks(s):
                if isinstance(b, Activities) and b.id:
                    self.acts[b.id] = b
                if isinstance(b, Plants) and self.plants is None:
                    self.plants = b

    def act_total(self, a: Activities) -> int:
        return money_int(a.total) if a.total.strip() else sum(money_int(i.value) for i in a.items)

    def bind(self, key: str):
        if key == "plants.first_total" and self.plants:
            p = self.plants.plants[0]
            return p.provistos + p.vacantes
        if key == "plants.procesos" and self.plants:
            return self.plants.procesos
        if key == "plants.posesiones" and self.plants:
            return self.plants.posesiones
        if key.startswith("act."):
            a = next(iter(self.acts.values()), None)
            if a is None:
                return 0
            return {"act.total": self.act_total(a), "act.budget": a.budget}.get(key, "")
        return None


def _blocks(s: Section):
    def walk(bs):
        for b in bs:
            yield b
            if isinstance(b, Grid):
                for col in b.columns:
                    yield from walk(col)
    yield from walk(s.blocks)
    for t in s.tabs:
        yield from walk(t.blocks)


# ───────────────────────── piezas ─────────────────────────
def media_img(m: Media, caption_style: str, wrap_attr: str = "") -> str:
    cap = f'<figcaption class="muted" style="{caption_style}">{esc(m.caption)}</figcaption>' if m.caption else ""
    return (f'<figure data-r{wrap_attr}>' + media_tag(m) + cap + "</figure>")


def media_tag(m: Media) -> str:
    if m.kind == "video":
        a = " controls" + (" autoplay" if m.autoplay else "") + (" loop" if m.loop else "") + (" muted" if m.muted else "") + " playsinline"
        return f'<video class="pimg" src="{attr(m.src)}"' + (f' poster="{attr(m.poster)}"' if m.poster else "") + f'{a} data-slot="{attr(m.slot)}"></video>'
    if m.kind == "audio":
        return f'<audio class="mediaa" src="{attr(m.src)}" controls data-slot="{attr(m.slot)}"></audio>'
    return (f'<img class="pimg zoom" src="{attr(m.src)}" data-slot="{attr(m.slot)}" data-h="{m.height}" alt="{attr(m.alt)}" title="Clic para ampliar">')


def stat_html(s, i: int, ctx: Ctx, card: bool, ident: str = "", lbl_id: str = "") -> str:
    v = s.value
    if s.bind:
        b = ctx.bind(s.bind)
        if b is not None:
            v = b
    long_ = " long" if s.long else ""
    if s.animate and isinstance(v, (int, float)):
        pre = f' data-pre="{attr(s.prefix)}"' if s.prefix else ""
        suf = f' data-suf="{attr(s.suffix)}"' if s.suffix else ""
        n = f'<span class="num{long_}"{ident} data-to="{int(v)}"{pre}{suf}>{esc(num_text(v, s.prefix, s.suffix))}</span>'
    else:
        n = f'<span class="num{long_}"{ident}>{esc(num_text(v, s.prefix, s.suffix))}</span>'
    lbl = f'<span class="lbl"{lbl_id}>{esc(s.label)}</span>'
    if card:
        return f'<div class="card stat" data-r style="--i:{i}">{n}{lbl}</div>'
    return f'<div class="stat">{n}{lbl}</div>'


def r_stat_grid(b: StatGrid, ctx: Ctx) -> str:
    cards = "".join(stat_html(s, k + 1, ctx, True) for k, s in enumerate(b.items))
    return f'<div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax({b.min_width}px,1fr));margin-bottom:24px">{cards}</div>'


def r_row_list(b: RowList, ctx: Ctx) -> str:
    h = f'<div class="bar-h" data-r>{esc(b.header)}</div><div class="evh"><span>{esc(b.columns[0])}</span><span>{esc(b.columns[1])}</span></div><div class="rows">'
    for k, it in enumerate(b.items):
        ps = "".join(f"<p>{rich(x)}</p>" for x in it.text.split("\n"))
        bar = (f'<div class="bar" style="--w:{it.bar_pct:g}%;margin-top:10px"><i style="background:{VAR.get(it.bar_color, "var(--blue)")}"></i></div>'
               if it.bar_pct is not None else "")
        h += (f'<div class="row" data-r style="--i:{k + 1}"><div class="n">{esc(it.n)}</div><div><b class="t">{esc(it.title)}</b>{ps}{bar}</div>'
              f'<div class="ev">{esc(it.evidence)}</div></div>')
    return h + "</div>"


def r_note_list(b: NoteList, ctx: Ctx) -> str:
    li = "".join(f"<li>{rich(x)}</li>" for x in b.items)
    return f'<div class="bar-h" style="margin-top:22px" data-r>{esc(b.header)}</div><div class="obs" data-r><ul>{li}</ul></div>'


def r_card_list(b: CardList, ctx: Ctx) -> str:
    li = "".join(f"<li>{rich(x)}</li>" for x in b.items)
    if b.style == "checks":
        t = f'<h3 class="st" data-r>{esc(b.title)}</h3>' if b.title else ""
        return f'{t}<div class="card" data-r><ul class="checks">{li}</ul></div>'
    cls = "warnl" if b.style == "warn" else "plain"
    t = f"<h3>{esc(b.title)}</h3>" if b.title else ""
    return f'<div class="card" data-r style="margin-top:18px">{t}<ul class="{cls}">{li}</ul></div>'


def viz_spec(viz: str, value: float, label: str) -> str:
    """Un porcentaje dibujado con el motor de gráficos (en vez del anillo original)."""
    spec = {"kind": viz, "labels": [label or "Avance"], "series": [{"name": label or "Avance", "values": [value], "color": "auto"}], "unit": "%", "max": 100,
            "height": 190, "show_legend": False, "show_values": True, "target": [], "events": [], "links": [], "totals": [], "forecast_labels": [], "bins": 0, "forecast": 0}
    return json.dumps(spec, ensure_ascii=False, separators=(",", ":"))


def r_ring(b: RingCard, ctx: Ctx) -> str:
    c = CLS.get(b.color) or semc(b.value, ctx.th)
    v = f"{b.value:g}"
    return (f'<div class="card" data-r style="--i:1;display:flex;gap:22px;align-items:center;flex-wrap:wrap">'
            + (f'<div class="rs-chart" style="width:min(100%,260px);flex:none" data-spec="{attr(viz_spec(b.viz, b.value, ""))}"></div>' if b.viz != "ring" else
               f'<div class="ring big sg-{c}" data-p="{v}"><div><span class="num" data-to="{int(b.value)}" data-suf="%">{int(b.value)}%</span></div></div>')
            + f'<p style="flex:1;min-width:180px;font-weight:700;font-size:16px">{esc(b.text)}</p></div>')


def r_status_list(b: StatusList, ctx: Ctx) -> str:
    t = f"<h3>{esc(b.title)}</h3>" if b.title else ""
    items = "".join(
        f'<div class="arl-i" style="border-left-color:{VAR[i.color]}"><b class="num" style="font-size:34px;color:{VAR[i.color]}">{esc(i.value)}</b><span>{rich(i.text)}</span></div>'
        for i in b.items)
    return f'<div class="card" data-r style="--i:2">{t}<div class="arl">{items}</div></div>'


def r_numbered(b: NumberedCards, ctx: Ctx) -> str:
    t = f'<h3 class="st" data-r>{esc(b.title)}</h3>' if b.title else ""
    cards = ""
    for k, it in enumerate(b.items):
        if it.tone == "violet":
            cards += f'<div class="card t4" data-r style="--i:{k + 1}"><p style="font-size:14px">{rich(it.text)}</p></div>'
        else:
            cards += f'<div class="card salert" data-r style="--i:{k + 1}"><span class="sn">{esc(it.n)}</span><p>{esc(it.text)}</p></div>'
    return f'<div class="sec">{t}<div class="grid g3">{cards}</div></div>'


def r_step_cards(b: StepCards, ctx: Ctx) -> str:
    steps = "".join(
        f'<div class="step" data-r style="--i:{k + 1}"><div class="big">{esc(s.n)}</div><span class="tag">{esc(s.tag)}</span><br><span class="date">{esc(s.date)}</span><h4>{esc(s.title)}</h4><p>{esc(s.text)}</p></div>'
        for k, s in enumerate(b.items))
    fig = media_img(b.media, "font-size:12px;font-weight:600;margin-top:8px") if b.media else ""
    return f'<div class="bar-h" data-r>{esc(b.header)}</div><div class="eg">{fig}<div class="steps stc">{steps}</div></div>'


def r_link_cards(b: LinkCards, ctx: Ctx) -> str:
    cards = ""
    for k, c in enumerate(b.items):
        bt = c.button
        if bt.disabled:
            btn = f'<span class="lbtn off">{esc(bt.label)}</span>'
        else:
            pend = f' data-pending="{attr(bt.note)}"' if bt.note else ""
            btn = f'<a class="lbtn" href="{attr(bt.url)}" target="_blank" rel="noopener noreferrer"{pend}>{esc(bt.label)}</a>'
        cards += (f'<div class="card lcard" data-r style="--i:{k + 1}"><div class="lnum">{esc(c.n)}</div><h3>{esc(c.title)}</h3>'
                  f'<p class="muted">{esc(c.text)}</p>{btn}</div>')
    return f'<div class="grid g3">{cards}</div>'


def r_gallery(b: Gallery, ctx: Ctx) -> str:
    t = f'<h3 class="st" data-r>{esc(b.title)}</h3>' if b.title else ""
    figs = "".join(media_img(m, "font-size:12px;font-weight:700;margin-top:8px;text-align:center", f' style="--i:{k + 1}"') for k, m in enumerate(b.items))
    side = ""
    if b.side_card:
        li = "".join(f"<li>{rich(x)}</li>" for x in b.side_card.items)
        side = f'<div class="card" data-r style="--i:3"><h3>{esc(b.side_card.title)}</h3><ul class="plain" style="margin-top:10px">{li}</ul></div>'
    return f'<div class="sec">{t}<div class="split2"><div class="qrgrid">{figs}</div>{side}</div></div>'


def r_table(b: Table, ctx: Ctx) -> str:
    t = f'<h3 class="st" data-r>{esc(b.title)}</h3>' if b.title else ""
    head = "".join(f"<th>{esc(c.label)}</th>" for c in b.columns)
    body = ""
    for r in b.rows:
        body += "<tr>"
        for ci, c in enumerate(b.columns):
            v = r.get(c.key, "")
            if c.format == "pill":
                cell = f'<span class="tag-v">{esc(v)}</span>'
            elif c.format == "pct_bar":
                k = semc(v, ctx.th)
                cell = f'<div class="pc sg-{k}"><div class="bar sg-{k}" style="--w:{float(v):g}%"><i></i></div><b class="sgt">{float(v):g}%</b></div>'
            elif c.format == "money" or c.format == "number":
                cell = esc(v)
            else:
                cell = esc(v)
            if ci == 0 and c.format == "text":
                cell = f"<b>{cell}</b>"
            body += f"<td>{cell}</td>"
        body += "</tr>"
    return f'{t}<div class="tw" data-r><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def r_plants(b: Plants, ctx: Ctx) -> str:
    t = f'<h3 class="st" data-r>{esc(b.title)}</h3>' if b.title else ""
    return f'{t}<div id="perBox"></div>'


def pt_counts(w: Workflow) -> dict:
    c = {"ejecutado": 0, "proceso": 0, "espera": 0}
    for s in w.steps:
        c[s.status] += 1
    return c


def r_workflow(b: Workflow, ctx: Ctx) -> str:
    c = pt_counts(b)
    return (f'<div class="card ptcard" data-r style="--i:1"><div class="ptico">▤</div><h3 class="st" style="margin-bottom:8px">{esc(b.heading)}</h3>'
            f'<p class="muted" style="font-size:14px">{esc(b.teaser)}</p><div class="mini"><span class="s-ejecutado"><i class="sd"></i><b class="ptm-ej">{c["ejecutado"]}</b> {T(ctx, "wf.ejecutado")}</span>'
            f'<span class="s-proceso"><i class="sd"></i><b class="ptm-pr">{c["proceso"]}</b> {T(ctx, "wf.proceso")}</span><span class="s-espera"><i class="sd"></i><b class="ptm-es">{c["espera"]}</b> {T(ctx, "wf.espera")}</span></div>'
            f'<button class="lbtn" id="ptBtn" data-ptbtn type="button" data-href="{attr(b.link)}">{esc(b.button_label)}</button></div>')


def r_agreement(b: Agreement, ctx: Ctx) -> str:
    return '<div class="sec" data-acu><div id="acuBox" class="acu"></div></div>'


def r_activities(b: Activities, ctx: Ctx) -> str:
    ph = attr(ctx.rep.meta.texts.get("act.buscar") or TEXTS["act.buscar"][0])
    th = "".join(f"<th{s}>{T(ctx, k)}</th>" for k, s in (("act.h_medida", ""), ("act.h_actividad", ""), ("act.h_period", ""), ("act.h_pct", ""), ("act.h_fecha", ""), ("act.h_obs", ""), ("act.h_valor", ' style="text-align:right"')))
    return (f'<div class="bar-h">{esc(b.title or "ACTIVIDADES")}</div>'
            f'<div class="tools" style="padding-top:16px"><input class="srch" id="srch" type="search" placeholder="{ph}" aria-label="Buscar actividad">'
            f'<button class="fbtn on" data-f="all" type="button">{T(ctx, "act.f_todas")}</button><button class="fbtn" data-f="zero" type="button">{T(ctx, "act.f_cero")}</button>'
            f'<button class="fbtn" data-f="val" type="button">{T(ctx, "act.f_val")}</button></div>'
            f'<div class="tw"><table class="act-tb"><thead><tr>{th}</tr></thead>'
            '<tbody id="tb"></tbody></table></div>')


def r_budget(b: Budget, ctx: Ctx) -> str:
    a = ctx.acts[b.source]
    tot = f' data-total="{attr(a.total)}"' if a.total.strip() else ""
    vz = f' data-viz="{b.viz}"' if b.viz != "donut" else ""
    return f'<div class="bar-h">{esc(b.title or "PRESUPUESTO")}</div><div id="presBox" data-budget="{attr(a.budget)}"{tot}{vz} data-totlabel="{attr(a.total_label)}"></div>'


def r_calendar(b: CalendarBlock, ctx: Ctx) -> str:
    return f'<div class="bar-h">{esc(b.title or "CALENDARIO")}</div><div id="calBox" style="padding-top:16px"></div>'


def r_proposals(b: Proposals, ctx: Ctx) -> str:
    h = ""
    if "ancheta" in b.show:
        img = media_tag(b.ancheta_media) if b.ancheta_media else ""
        h += f'<div class="bar-h">{esc(b.ancheta_title)}</div><div class="split" style="padding:16px 0 26px"><div id="ancBox"></div>{img}</div>'
    if "velitas" in b.show:
        img = media_tag(b.velitas_media) if b.velitas_media else ""
        note = f'<div class="note">{esc(b.velitas_note)}</div>' if b.velitas_note else ""
        h += f'<div class="bar-h">{esc(b.velitas_title)}</div><div class="split" style="padding-top:16px"><div><div id="velBox"></div>{note}</div>{img}</div>'
    return h


def r_chart(b: Chart, ctx: Ctx) -> str:
    spec = b.model_dump(mode="json", exclude={"id", "title", "hidden", "type", "caption", "span", "bg", "fg", "tints"})
    h = f"<h3>{esc(b.title)}</h3>" if b.title else ""
    cap = f'<p class="cap">{esc(b.caption)}</p>' if b.caption else ""
    return f'<div class="card chart-card" data-r>{h}<div class="rs-chart" data-spec="{attr(json.dumps(spec, ensure_ascii=False, separators=(",", ":")))}"></div>{cap}</div>'


def r_media(b: MediaBlock, ctx: Ctx) -> str:
    t = f'<h3 class="st" data-r>{esc(b.title)}</h3>' if b.title else ""
    cap = f'<figcaption class="muted" style="font-size:12px;font-weight:600;margin-top:8px">{esc(b.media.caption)}</figcaption>' if b.media.caption else ""
    return f'{t}<figure data-r>{media_tag(b.media)}{cap}</figure>'


def r_grid(b: Grid, ctx: Ctx) -> str:
    t = f'<h3 class="st" data-r>{esc(b.title)}</h3>' if b.title else ""
    cols = ""
    for ci, col in enumerate(b.columns):
        inner = render_list(col, ctx, f"{ctx.path}.columns.{ci}") + add_slot(ctx, f"{ctx.path}.columns.{ci}")
        cols += f"<div>{inner}</div>" if ci == 0 else f'<div class="stk">{inner}</div>'
    sec = " sec" if not b.title else ""
    return f'{t}<div class="grid g2{sec}">{cols}</div>'


R = {StatGrid: r_stat_grid, RowList: r_row_list, NoteList: r_note_list, CardList: r_card_list, RingCard: r_ring, StatusList: r_status_list,
     NumberedCards: r_numbered, StepCards: r_step_cards, LinkCards: r_link_cards, Gallery: r_gallery, Table: r_table, Plants: r_plants,
     Workflow: r_workflow, Agreement: r_agreement, Activities: r_activities, Budget: r_budget, CalendarBlock: r_calendar,
     Proposals: r_proposals, Chart: r_chart, MediaBlock: r_media, Grid: r_grid}


SPAN_W = {"1/2": "calc(50% - 10px)", "1/3": "calc(33.333% - 14px)", "2/3": "calc(66.666% - 7px)", "1/4": "calc(25% - 15px)", "3/4": "calc(75% - 5px)"}


def render_list(blocks, ctx: Ctx, base: str) -> str:
    """Dibuja una lista de casillas; las consecutivas con ancho parcial se agrupan en una fila."""
    out, row = [], []

    def flush():
        nonlocal row
        if row:
            out.append('<div class="rs-row">' + "".join(row) + "</div>")
            row = []
    for i, b in enumerate(blocks):
        h = render_block(b, ctx, f"{base}.{i}")
        if not h:
            continue
        if b.span != "full":
            row.append(f'<div class="rs-c" style="flex:0 0 {SPAN_W[b.span]}">{h}</div>')
        else:
            flush()
            out.append(h)
    flush()
    return "".join(out)


def render_block(b, ctx: Ctx, path: str = "") -> str:
    if b.hidden:
        return ""
    prev, ctx.path = ctx.path, path
    try:
        out = R[type(b)](b, ctx)
    finally:
        ctx.path = prev
    if b.bg or b.fg:
        st = (f"background:{b.bg};" if b.bg else "") + (f"color:{b.fg};--text:{b.fg};--head:{b.fg};--muted:{b.fg};" if b.fg else "")
        out = f'<div class="rs-sty" style="{st}">{out}</div>'
    tint = f' data-tint="{attr(json.dumps([x.model_dump() for x in b.tints if x.c], ensure_ascii=False))}"' if any(x.c for x in b.tints) else ""
    if ctx.edit and path:  # modo edición: cada casilla se marca para poder seleccionarla en la vista previa
        out = f'<div class="rs-b" data-bp="{attr(path)}" data-bt="{b.type}"{tint} style="display:contents">{out}</div>'
    elif tint:
        out = f'<div class="rs-t"{tint} style="display:contents">{out}</div>'
    return out


def add_slot(ctx: Ctx, path: str) -> str:
    return f'<div class="rs-add" data-addto="{attr(path)}">+ Agregar casilla</div>' if ctx.edit else ""


# ───────────────────────── secciones, inicio, alertas ─────────────────────────
def r_section(s: Section, ctx: Ctx, si: int = 0) -> str:
    h = f'<section class="panel" id="p-{s.id}"><div class="ptitle" data-r><div><h2>{esc(s.title)}</h2><p>{esc(s.subtitle)}</p></div></div>'
    if s.tabs:
        h += f'<div class="subnav" id="sn-{s.id}">' + "".join(
            f'<button class="sbtn{" on" if i == 0 else ""}" data-s="{attr(t.id)}" type="button">{esc(t.label)}</button>' for i, t in enumerate(s.tabs)) + "</div>"
        for i, t in enumerate(s.tabs):
            h += f'<div class="sub{" on" if i == 0 else ""}" data-sub="{attr(t.id)}">' + render_list(t.blocks, ctx, f"sections.{si}.tabs.{i}.blocks") + add_slot(ctx, f"sections.{si}.tabs.{i}.blocks") + "</div>"
    else:
        h += render_list(s.blocks, ctx, f"sections.{si}.blocks") + add_slot(ctx, f"sections.{si}.blocks")
        if any(isinstance(b, Grid) and any(isinstance(x, Workflow) for c in b.columns for x in c) for b in s.blocks):
            h += '<div class="printonly" id="ptPrint"></div>'
    return h + "</section>"


HOME_IDS = {"plants.first_total": ' id="homePerPlanta"', "plants.procesos": ' id="homePerProc"', "plants.posesiones": ' id="homePerPos"', "act.total": ' id="homeTotal"'}


def r_home_card(s: Section, i: int, ctx: Ctx) -> str:
    c = s.home
    h = f'<div class="card gcard" data-go="{s.id}" data-r style="--i:{i}"><h3>{esc(c.title or s.label)}</h3>'
    stats = ""
    for st in c.stats:
        lid = ' id="homeTotLbl"' if st.bind == "act.total" else ""
        stats += stat_html(st, 0, ctx, False, HOME_IDS.get(st.bind or "", ""), lid)
    if len(c.stats) > 1 or c.columns:
        n = c.columns or len(c.stats)
        h += f'<div class="grid" style="grid-template-columns:{" ".join(["1fr"] * n)}">{stats}</div>'
    else:
        h += stats
    if c.text:
        h += f'<p class="muted">{esc(c.text)}</p>'
    if c.tag:
        tag = c.tag
        if "{act.budget}" in tag:
            tag = tag.replace("{act.budget}", str(ctx.bind("act.budget")))
            h += f'<p><span class="tag-v" id="homeBudget">{esc(tag)}</span></p>'
        else:
            sty = ' style="background:rgba(46,125,50,.16);color:var(--green2)"' if c.tag_tone == "green" else ""
            h += f'<p><span class="tag-v"{sty}>{esc(c.tag)}</span></p>'
    return h + '<span class="go">Ver información →</span></div>'


def r_inicio(ctx: Ctx) -> str:
    m = ctx.rep.meta
    cards = "".join(r_home_card(s, i + 1, ctx) for i, s in enumerate(ctx.rep.sections) if s.home)
    n = len([s for s in ctx.rep.sections if s.home])
    cards += f'<div class="card gcard" id="homePT" data-r style="--i:{n + 1}"></div>'
    cards += f'<div class="card gcard" id="homePRES" data-goto="bienestar" data-r style="--i:{n + 2}"></div>'
    c = {"alto": 0, "medio": 0, "bajo": 0}
    for a in ctx.rep.alerts:
        c[a.level] += 1
    hid = "" if m.show_alerts else " hidden"
    cards += (f'<div class="card gcard" data-go="alertas"{hid} data-r style="--i:{n + 3}"><h3>Alertas de todos los grupos</h3>'
              f'<div class="mini" style="font-size:15px;gap:6px 20px"><span class="nv-alto"><i class="sd"></i><b id="h-alto">{c["alto"]}</b> alto</span><span class="nv-medio"><i class="sd"></i><b id="h-medio">{c["medio"]}</b> medio</span><span class="nv-bajo"><i class="sd"></i><b id="h-bajo">{c["bajo"]}</b> bajo</span></div>'
              '<p class="muted">Vista transversal filtrable por nivel y por grupo.</p><span class="go">Ver alertas →</span></div>')
    return ('<section class="panel active" id="p-inicio"><div class="hero" data-r>'
            f'<div class="hero-qr" id="heroQr" title="Ver en el celular"><div id="qrHero" title="{attr(m.share_url)}"></div><small>Ábrelo en tu celular</small></div>'
            f'<small>{esc(m.hero_kicker)}</small><h2>{esc(m.hero_title)}</h2><p>{esc(m.hero_text)}</p><div class="hstats" id="heroStats"></div></div>'
            f'<div class="grid g3 sec" id="homeCards">{cards}</div></section>')


def r_alertas(ctx: Ctx) -> str:
    c = {"alto": 0, "medio": 0, "bajo": 0}
    for a in ctx.rep.alerts:
        c[a.level] += 1
    tot = len(ctx.rep.alerts)
    names = {"personal": "Gestión de Personal", "nomina": "Nómina", "bienestar": "Bienestar", "historias": "Historias Laborales", "sst": "SST"}
    grp = '<button class="fbtn on" data-ag="all" type="button">Todos los grupos</button>' + "".join(
        f'<button class="fbtn" data-ag="{g}" type="button">{n}</button>' for g, n in names.items())
    return ('<section class="panel" id="p-alertas"><div class="ptitle" data-r><div><h2>Alertas de todos los grupos</h2><p>Vista transversal · filtra por nivel y por grupo</p></div></div>'
            '<div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-bottom:22px">'
            f'<div class="card stat" data-r style="--i:1;border-top:6px solid var(--red)"><span class="num" id="al-alto" data-to="{c["alto"]}" style="color:var(--red)">{c["alto"]}</span><span class="lbl">Riesgo alto</span></div>'
            f'<div class="card stat" data-r style="--i:2;border-top:6px solid var(--yellow)"><span class="num" id="al-medio" data-to="{c["medio"]}" style="color:var(--yellow)">{c["medio"]}</span><span class="lbl">Riesgo medio</span></div>'
            f'<div class="card stat" data-r style="--i:3;border-top:6px solid var(--green2)"><span class="num" id="al-bajo" data-to="{c["bajo"]}" style="color:var(--green2)">{c["bajo"]}</span><span class="lbl">Riesgo bajo</span></div>'
            f'<div class="card stat" data-r style="--i:4"><span class="num" id="al-tot" data-to="{tot}">{tot}</span><span class="lbl">Alertas en total</span></div></div>'
            '<div class="tools"><div class="pt-grp" id="alN"><button class="fbtn on" data-an="all" type="button">Todos los niveles</button><button class="fbtn" data-an="alto" type="button">Alto</button><button class="fbtn" data-an="medio" type="button">Medio</button><button class="fbtn" data-an="bajo" type="button">Bajo</button></div>'
            '<input class="srch" id="alQ" type="search" placeholder="Buscar en las alertas…" aria-label="Buscar alertas"></div>'
            f'<div class="tools" style="margin-top:-4px"><div class="pt-grp" id="alG">{grp}</div></div>'
            '<div class="tw"><table class="al-tb"><thead><tr><th>Nivel</th><th>Grupo</th><th>Alerta</th><th></th></tr></thead><tbody id="alB"></tbody></table></div></section>')


# ───────────────────────── datos para el JS ─────────────────────────
def ji(v):
    return int(v) if float(v).is_integer() else v


def js_data(rep: Report) -> dict:
    ctx = Ctx(rep)
    d = {"TX": dict(rep.meta.texts), "SB": {s.id: s.icon for s in rep.sections if not s.hidden and s.icon != "none"}}
    a = next(iter(ctx.acts.values()), None)
    d["BIEN"] = [[i.measure, i.name, i.frequency, ji(i.pct), i.date, i.note, i.value] for i in a.items] if a else []
    wf = next((x for s in rep.sections for x in _blocks(s) if isinstance(x, Workflow)), None)
    d["PT"] = [[s.n, s.title, s.owner, s.status, s.times, s.hours, s.other] for s in wf.steps] if wf else []
    d["AL"] = [[x.group, x.level, x.text] for x in rep.alerts]
    pr = next((x for s in rep.sections for x in _blocks(s) if isinstance(x, Proposals)), None)
    d["DEV"] = {"vac": pr.vacations if pr else [], "bon": pr.bonus if pr else [], "qui": [], "anc": pr.ancheta if pr else [], "vel": pr.velitas if pr else []}
    ag = next((x for s in rep.sections for x in _blocks(s) if isinstance(x, Agreement)), None)
    if ag:
        d["ACU"] = {"tabla": ag.table is not None, "titulo": ag.heading, "corte": ag.cutoff, "prom": ag.avg, "col": {"auto": ""}.get(ag.color, CLS.get(ag.color, "")),
                    "texto": ag.summary, "rows": [], "avances": [[x] for x in ag.progress], "aspectos": [[x] for x in ag.watch], "hitoFecha": ag.milestone_date, "hito": [[x] for x in ag.milestone]}
        if ag.viz != "ring":
            d["ACU"]["vizSpec"] = viz_spec(ag.viz, ag.avg, "")
    pl = ctx.plants
    if pl:
        d["PER"] = {"plantas": [[p.label, p.provistos, p.vacantes] for p in pl.plants], "procesos": pl.procesos, "procLabel": pl.procesos_label,
                    "posesiones": pl.posesiones, "posLabel": pl.posesiones_label, "logro": pl.logro}
        if pl.viz != "bars":
            d["PER"]["viz"] = pl.viz
    return d


def _json(v) -> str:
    return json.dumps(v, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def hours_text(w: Workflow | None) -> str:
    if not w:
        return ""
    hs, sin = 0.0, []
    for s in w.steps:
        try:
            hs += float(str(s.hours).replace(",", "."))
        except ValueError:
            sin.append(s.n)
    t = ("%g" % hs).replace(".", ",")
    return f"Suma de la columna HORA: {t} h" + (f" (sin dato en los pasos {' y '.join(map(str, sin))})" if sin else "")


def _has_chart(rep: Report) -> bool:
    return any(not b.hidden and (isinstance(b, Chart) or (isinstance(b, (RingCard, Agreement)) and b.viz != "ring")
                                 or (isinstance(b, Plants) and b.viz != "bars") or (isinstance(b, Budget) and b.viz != "donut"))
               for s in rep.sections for b in _blocks(s))


def _mix(h: str, k: float) -> str:
    """Oscurece (k<0) o aclara (k>0) un color #rrggbb."""
    r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
    f = (lambda c: round(c * (1 + k))) if k < 0 else (lambda c: round(c + (255 - c) * k))
    return "#%02x%02x%02x" % tuple(max(0, min(255, f(c))) for c in (r, g, b))


PALETTES = {
    "oceano": ({"blue": "#0E7490", "navy": "#0B4F6C", "yellow": "#E39A0B", "gold": "#38BDF8"},
               {"blue": "#38BDF8", "navy": "#0E7490", "yellow": "#F5A623", "gold": "#38BDF8", "bg1": "#06151C", "bg2": "#0C2A38", "panel": "#0B2230"}),
    "bosque": ({"blue": "#2F7D4F", "navy": "#1F5A3A", "yellow": "#C98A0B", "gold": "#A3E635"},
               {"blue": "#4ADE80", "navy": "#2F7D4F", "yellow": "#F5A623", "gold": "#A3E635", "bg1": "#07140D", "bg2": "#0F2A1A", "panel": "#0D2216"}),
    "vino": ({"blue": "#9F1D3A", "navy": "#6E1226", "yellow": "#D9822B", "gold": "#F4B860"},
             {"blue": "#F87191", "navy": "#B02A4D", "yellow": "#F5A623", "gold": "#F4B860", "bg1": "#1A0A10", "bg2": "#33121E", "panel": "#2A0F18"}),
    "grafito": ({"blue": "#475569", "navy": "#1E293B", "yellow": "#D97706", "gold": "#FBBF24"},
                {"blue": "#94A3B8", "navy": "#475569", "yellow": "#F5A623", "gold": "#FBBF24", "bg1": "#0B0F14", "bg2": "#1B2330", "panel": "#151C27"}),
    "atardecer": ({"blue": "#7C3AED", "navy": "#4C1D95", "yellow": "#EA580C", "gold": "#FDBA74"},
                  {"blue": "#A78BFA", "navy": "#6D28D9", "yellow": "#FB923C", "gold": "#FDBA74", "bg1": "#130A1F", "bg2": "#261444", "panel": "#1E0F36"}),
}
FONTS = {"sistema": "system-ui,-apple-system,'Segoe UI',Arial,sans-serif", "georgia": "Georgia,'Times New Roman',serif",
         "verdana": "Verdana,Geneva,sans-serif", "trebuchet": "'Trebuchet MS',Helvetica,sans-serif", "mono": "ui-monospace,Menlo,Consolas,monospace"}


def theme_css(th) -> str:
    L, D = (dict(x) for x in PALETTES.get(th.palette, ({}, {})))
    if th.primary:
        L.update(blue=th.primary, navy=_mix(th.primary, -.3)); D.update(blue=_mix(th.primary, .25), navy=th.primary)
    if th.accent:
        L.update(yellow=th.accent, gold=_mix(th.accent, .25)); D.update(yellow=th.accent, gold=_mix(th.accent, .25))
    for d in (L, D):
        if "blue" in d:
            d["k1"] = d["blue"]
    if th.font in FONTS:
        L["sans"] = D["sans"] = FONTS[th.font]
    if not L and not D:
        return ""
    f = lambda d: ";".join(f"--{k}:{v}" for k, v in d.items())
    return (f'<style id="rs-theme">html:root:not([data-theme="dark"]){{{f(L)}}}'
            f'@media screen{{html:root[data-theme="dark"]{{{f({**L, **D})}}}}}</style>')


def render(rep: Report, edit: bool = False) -> str:
    m = rep.meta
    ctx = Ctx(rep, edit)
    out = SHELL.read_text(encoding="utf-8")
    tabs = '<button class="tab active" data-t="inicio" type="button">Inicio</button>\n' + "\n".join(
        f'    <button class="tab" data-t="{s.id}" type="button"{" hidden" if s.hidden else ""}>{esc(s.label)}</button>' for s in rep.sections)
    tabs += f'\n    <button class="tab" data-t="alertas" type="button"{"" if m.show_alerts else " hidden"}>Alertas</button>'
    panels = r_inicio(ctx) + "\n" + "\n".join(r_section(s, ctx, si) for si, s in enumerate(rep.sections) if not s.hidden) + "\n" + r_alertas(ctx)
    wf = next((x for s in rep.sections for x in _blocks(s) if isinstance(x, Workflow)), None)
    c = pt_counts(wf) if wf else {"ejecutado": 0, "proceso": 0, "espera": 0}
    vals = {
        "TITLE_TAG": f"Informe – {m.subtitle}", "THEME": m.theme.default, "COVER": m.theme.cover, "LOGO_DARK": attr(m.theme.logo_dark),
        "LOGO_LIGHT": attr(m.theme.logo_light), "ORG_UP": esc(m.org.upper()), "ORG": esc(m.org), "INTRO_WORD": attr(m.theme.intro_word),
        "SUBTITLE": esc(m.subtitle), "BOSS_ROLE": esc(m.boss_role), "BOSS": esc(m.boss), "TITLE": esc(m.title), "TAGLINE": esc(m.tagline),
        "SHARE_URL": attr(m.share_url), "PALACE_URL": m.theme.palace_url, "FOOTER": esc(m.footer),
        "PT_TITLE": esc(wf.modal_title if wf else ""), "PT_SUB": esc(wf.subtitle if wf else ""),
        "C_EJ": c["ejecutado"], "C_PR": c["proceso"], "C_ES": c["espera"], "C_H": esc(hours_text(wf)),
    }
    for k, v in vals.items():
        out = out.replace(f"@@{k}@@", str(v))
    out = out.replace("@@TABS@@", tabs).replace("@@PANELS@@", panels)
    for name, v in js_data(rep).items():
        out = re.sub(r"/\*@%s\*/.*?/\*@/%s\*/" % (name, name), lambda _m, n=name, j=_json(v): f"/*@{n}*/{j}/*@/{n}*/", out, flags=re.S)
    if _has_chart(rep):  # el motor de gráficos solo viaja si el informe los usa
        tpl = SHELL.parent
        out = out.replace("</head>", "<style>" + (tpl / "charts.css").read_text(encoding="utf-8") + "</style></head>", 1)
        out = out.replace("</body>", "<script>" + (tpl / "charts.js").read_text(encoding="utf-8").replace("</", "<\\/") + "</script></body>", 1)
    if not edit:  # el informe completo viaja dentro del HTML para poder reimportarlo sin pérdida
        blob = json.dumps(rep.model_dump(mode="json"), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        out = out.replace("</body>", f'<script type="application/json" id="rs-report">{blob}</script></body>', 1)
    css = theme_css(m.theme) + ".rs-row{display:flex;flex-wrap:wrap;gap:20px;align-items:stretch;margin-bottom:24px}.rs-c{min-width:0}.rs-sty{border-radius:16px;padding:16px;margin-bottom:12px}@media(max-width:760px){.rs-c{flex-basis:100%!important}}"
    out = out.replace("</head>", f"<style>{css[css.index('.rs-row'):]}</style>" + css[:css.index(".rs-row")] + "</head>", 1) if False else out.replace("</head>", css[:css.index(".rs-row")] + "<style>" + css[css.index(".rs-row"):] + "</style></head>", 1)
    left = re.findall(r"@@[A-Z_]+@@", out)
    assert not left, f"marcadores sin resolver: {left}"
    return out


if __name__ == "__main__":
    import sys
    from .validate import load
    rep, issues = load(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")))
    if issues:
        raise SystemExit("\n".join(issues))
    Path(sys.argv[2]).write_text(render(rep), encoding="utf-8")
    print("ok", sys.argv[2])
