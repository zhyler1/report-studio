"""Exportación a PowerPoint (.pptx): portada, una o más láminas por sección y las alertas.

Texto, cifras, tablas y gráficos de barras, líneas y tortas salen como objetos nativos de PowerPoint (editables).
Los gráficos de otro tipo (radar, treemap, sankey…) se dejan como aviso: para esos, usa el informe HTML o el PDF.
"""
from __future__ import annotations

import io
import math
import re

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

from .render import Ctx, _blocks, num_text
from .schema import (Activities, Agreement, CalendarBlock, CardList, Chart, Gallery, Grid, Group, LinkCards, MediaBlock, NoteList, NumberedCards,
                     Plants, PlantCard, Callout, Heading, TextBlock, LinkBlock, AgendaBlock, Proposals, Report, RingCard, RowList, StatGrid, StatusList, StepCards, Table, Workflow, Budget)

W, H = 13.333, 7.5
MX, TOP, BOT = 0.55, 1.45, 7.1
NAVY, GOLD, INK, MUTED, LINE = RGBColor(0x1A, 0x3A, 0x6B), RGBColor(0xFD, 0xC8, 0x00), RGBColor(0x14, 0x24, 0x3F), RGBColor(0x56, 0x62, 0x7A), RGBColor(0xCB, 0xD2, 0xDE)
SEM = {"green": RGBColor(0x2E, 0x7D, 0x32), "yellow": RGBColor(0xE3, 0x9A, 0x0B), "orange": RGBColor(0xE2, 0x6A, 0x1B), "red": RGBColor(0xC6, 0x28, 0x28)}
CHART_OK = {"bar": XL_CHART_TYPE.COLUMN_CLUSTERED, "hbar": XL_CHART_TYPE.BAR_CLUSTERED, "stacked": XL_CHART_TYPE.COLUMN_STACKED,
            "stacked100": XL_CHART_TYPE.COLUMN_STACKED_100, "line": XL_CHART_TYPE.LINE_MARKERS, "area": XL_CHART_TYPE.AREA,
            "stacked_area": XL_CHART_TYPE.AREA_STACKED, "pie": XL_CHART_TYPE.PIE, "donut": XL_CHART_TYPE.DOUGHNUT}


def clean(s) -> str:
    s = "" if s is None else str(s)
    s = re.sub(r"\{\{#[0-9a-fA-F]{3,8}\|(.*?)\}\}", r"\1", s)   # marcas de color de texto
    return s.replace("**", "").replace("&nbsp;", " ").strip()


def _hex(h: str, d: RGBColor) -> RGBColor:
    h = (h or "").lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)) if re.fullmatch(r"[0-9a-fA-F]{6}", h) else d


class Deck:
    def __init__(self, rep: Report):
        self.rep, self.ctx = rep, Ctx(rep)
        self.prs = Presentation()
        self.prs.slide_width, self.prs.slide_height = Inches(W), Inches(H)
        self.navy = _hex(rep.meta.theme.primary, NAVY)
        self.s = None
        self.y = TOP
        self.title = ""

    # ── primitivas ──
    def text(self, x, y, w, h, t, size=14, bold=False, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
        tb = self.s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = anchor
        for m in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
            setattr(tf, m, Inches(0.04))
        lines = t if isinstance(t, list) else [t]
        for i, ln in enumerate(lines):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.alignment = align
            r = p.add_run()
            r.text = clean(ln)
            r.font.size, r.font.bold, r.font.color.rgb = Pt(size), bold, color
            r.font.name = "Calibri"
        return tb

    def rect(self, x, y, w, h, fill, line=None):
        sh = self.s.shapes.add_shape(1, Inches(x), Inches(y), Inches(w), Inches(h))
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
        if line is None:
            sh.line.fill.background()
        else:
            sh.line.color.rgb = line
        sh.shadow.inherit = False
        return sh

    def new(self, title, sub=""):
        self.s = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        self.rect(0, 0, W, 1.15, self.navy)
        self.rect(0, 1.15, W, 0.07, GOLD)
        self.text(MX, 0.12, W - 2 * MX, 0.6, title, 26, True, RGBColor(255, 255, 255), anchor=MSO_ANCHOR.MIDDLE)
        if sub:
            self.text(MX, 0.68, W - 2 * MX, 0.4, sub, 13, False, RGBColor(0xD9, 0xDE, 0xE8))
        self.y, self.title = TOP, title
        if not title.endswith("(cont.)"):
            self.base = title

    def need(self, h, sub=""):
        if self.y + h > BOT:
            self.new(self.base + " (cont.)", sub)

    @staticmethod
    def lines(txt: str, width_in: float, pt: float) -> int:
        per = max(8, int(width_in * 72 / (pt * 0.5)))
        return sum(max(1, math.ceil(len(clean(p)) / per)) for p in str(txt).split("\n"))

    # ── casillas ──
    def heading(self, t):
        if not t:
            return
        self.need(0.5)
        self.text(MX, self.y, W - 2 * MX, 0.4, t.upper(), 13, True, self.navy)
        self.y += 0.42

    def bullets(self, items, size=14, mark="•"):
        for it in items:
            t = clean(it if isinstance(it, str) else getattr(it, "text", it))
            h = self.lines(t, W - 2 * MX - 0.3, size) * size * 1.35 / 72 + 0.1
            self.need(h)
            self.text(MX, self.y, 0.3, h, mark, size, True, self.navy)
            self.text(MX + 0.3, self.y, W - 2 * MX - 0.3, h, t, size)
            self.y += h

    def stats(self, items):
        per = min(4, max(1, len(items)))
        cw = (W - 2 * MX - 0.2 * (per - 1)) / per
        for r0 in range(0, len(items), per):
            self.need(1.7)
            for k, st in enumerate(items[r0:r0 + per]):
                v = st.value
                if getattr(st, "bind", None):
                    b = self.ctx.bind(st.bind)
                    v = v if b is None else b
                x = MX + k * (cw + 0.2)
                self.rect(x, self.y, cw, 1.55, RGBColor(0xF4, 0xF6, 0xFA), LINE)
                big = num_text(v, st.prefix, st.suffix)
                self.text(x + 0.1, self.y + 0.08, cw - 0.2, 0.75, big, 30 if len(big) < 11 else 22, True, self.navy)
                self.text(x + 0.1, self.y + 0.85, cw - 0.2, 0.65, st.label, 11, False, MUTED)
            self.y += 1.75

    def table(self, head, rows, widths=None, size=11):
        n = len(head)
        widths = widths or [1] * n
        tot = sum(widths)
        cw = [(W - 2 * MX) * w / tot for w in widths]
        i = 0
        while i < len(rows) or i == 0:
            avail = BOT - self.y
            if avail < 1.2:
                self.new(self.base + " (cont.)")
                avail = BOT - self.y
            chunk, used = [], 0.4
            while i < len(rows):
                rh = max(self.lines(str(c), cw[j] - 0.15, size) for j, c in enumerate(rows[i])) * size * 1.3 / 72 + 0.14
                if chunk and used + rh > avail:
                    break
                chunk.append(rows[i])
                used += rh
                i += 1
            gt = self.s.shapes.add_table(len(chunk) + 1, n, Inches(MX), Inches(self.y), Inches(W - 2 * MX), Inches(used))
            t = gt.table
            for j, w in enumerate(cw):
                t.columns[j].width = Inches(w)
            for j, hd in enumerate(head):
                self._cell(t.cell(0, j), hd, size, True, True)
            for r, row in enumerate(chunk, 1):
                for j, c in enumerate(row):
                    self._cell(t.cell(r, j), c, size, False, False)
            self.y += used + 0.2
            if not rows:
                break

    def _cell(self, c, v, size, bold, head):
        c.text = ""
        p = c.text_frame.paragraphs[0]
        r = p.add_run()
        r.text = clean(v)
        r.font.size, r.font.bold, r.font.name = Pt(size), bold, "Calibri"
        r.font.color.rgb = RGBColor(255, 255, 255) if head else INK
        c.fill.solid()
        c.fill.fore_color.rgb = self.navy if head else RGBColor(255, 255, 255)
        c.margin_left = c.margin_right = Inches(0.06)
        c.margin_top = c.margin_bottom = Inches(0.03)

    def chart(self, b: Chart):
        self.heading(b.title)
        if b.kind not in CHART_OK or not b.labels or not b.series:
            self.bullets([f"Gráfico «{b.kind}» disponible en el informe HTML o PDF (no tiene equivalente editable en PowerPoint)."], 12, "ℹ")
            return
        self.need(4.2)
        cd = CategoryChartData()
        cd.categories = [clean(x) for x in b.labels]
        for s in (b.series[:1] if b.kind in ("pie", "donut") else b.series):
            cd.add_series(clean(s.name), [float(v) for v in s.values[:len(b.labels)]])
        gf = self.s.shapes.add_chart(CHART_OK[b.kind], Inches(MX), Inches(self.y), Inches(W - 2 * MX), Inches(min(4.2, BOT - self.y)), cd)
        ch = gf.chart
        ch.has_legend = b.show_legend and (len(b.series) > 1 or b.kind in ("pie", "donut"))
        if ch.has_legend:
            ch.legend.position, ch.legend.include_in_layout = XL_LEGEND_POSITION.BOTTOM, False
        if b.show_values:
            pl = ch.plots[0]
            pl.has_data_labels = True
            pl.data_labels.font.size = Pt(10)
        self.y += min(4.2, BOT - self.y) + 0.15

    def block(self, b):
        if b.hidden:
            return
        if isinstance(b, StatGrid):
            self.stats(b.items)
        elif isinstance(b, RowList):
            self.heading(b.header)
            self.table(["#", b.columns[0], b.columns[1]],
                       [[it.n, f"{clean(it.title)}\n{clean(it.text)}", it.evidence] for it in b.items], [0.5, 7, 3])
        elif isinstance(b, (NoteList, CardList)):
            self.heading(getattr(b, "header", "") or getattr(b, "title", ""))
            self.bullets(b.items, 14, "✓" if getattr(b, "style", "") == "checks" else "⚠" if getattr(b, "style", "") == "warn" else "•")
        elif isinstance(b, RingCard):
            self.need(1.4)
            self.text(MX, self.y, 2.6, 1.1, f"{b.value:g} %", 40, True, self.navy)
            self.text(MX + 2.7, self.y + 0.1, W - 2 * MX - 2.7, 1.1, b.text, 16)
            self.y += 1.4
        elif isinstance(b, Table):
            self.heading(b.title)
            self.table([c.label for c in b.columns], [[("" if r.get(c.key) is None else r.get(c.key)) for c in b.columns] for r in b.rows])
        elif isinstance(b, Chart):
            self.chart(b)
        elif isinstance(b, Agreement):
            self.heading(f"{b.heading} · {b.cutoff}")
            self.need(1.4)
            self.text(MX, self.y, 2.6, 1.1, f"{b.avg:g} %", 40, True, self.navy)
            self.text(MX + 2.7, self.y + 0.05, W - 2 * MX - 2.7, 1.2, b.summary, 14)
            self.y += 1.4
            self.heading("Principales avances")
            self.bullets(b.progress, 13, "✓")
            self.heading("Aspectos que requieren seguimiento")
            self.bullets(b.watch, 13, "⚠")
            self.heading(f"Próximo hito · {b.milestone_date}")
            self.bullets(b.milestone, 13)
        elif isinstance(b, Plants):
            self.heading(b.title or "Planta de personal")
            self.table(["Planta", "Provistos", "Vacantes", "Total"], [[p.label, p.provistos, p.vacantes, p.provistos + p.vacantes] for p in b.plants], [5, 2, 2, 2])
            self.bullets([f"{b.procesos} · {b.procesos_label}", f"{b.posesiones} · {b.posesiones_label}", f"Logro destacado: {clean(b.logro)}"])
        elif isinstance(b, PlantCard):
            self.heading(b.label)
            self.bullets([f"Provistos: {b.provistos}", f"Vacantes: {b.vacantes}", f"Total: {b.provistos + b.vacantes}"])
        elif isinstance(b, Callout):
            self.heading(b.heading)
            self.bullets([clean(b.text)])
        elif isinstance(b, LinkBlock):
            if b.title:
                self.heading(b.title)
            self.bullets([f"{clean(i.label)}" + (f" — {i.url}" if i.url else "") + (f": {clean(i.text)}" if i.text else "") for i in b.items])
        elif isinstance(b, AgendaBlock):
            from .render import parse_agenda
            if b.title:
                self.heading(b.title)
            self.bullets([f"{e['d']}" + (f" a {e['e']}" if e['e'] != e['d'] else "") + f" · {clean(e['t'])}" + (f" ({clean(e['x'])})" if e['x'] else "") for e in parse_agenda(b.text)[0]])
        elif isinstance(b, TextBlock):
            if b.title:
                self.heading(b.title)
            self.bullets([clean(x) for x in b.text.split("\n\n") if x.strip()])
        elif isinstance(b, Heading):
            self.heading(b.title or "")
        elif isinstance(b, Workflow):
            self.heading(b.heading or b.title or "Flujo de trabajo")
            self.table(["#", "Actividad", "Responsable", "Estado", "Horas"], [[s.n, s.title, s.owner, s.status, s.hours] for s in b.steps], [0.5, 6, 3, 1.5, 1])
        elif isinstance(b, Activities):
            self.heading(b.title or "Actividades")
            self.table(["Medida", "Actividad", "Periodicidad", "%", "Fecha", "Valor"],
                       [[a.measure, a.name, a.frequency, f"{a.pct:g} %", a.date, a.value] for a in b.items], [1.3, 3.2, 1.6, 0.8, 1.8, 1.6], 10)
            if b.budget:
                self.bullets([f"{b.total_label}: {b.total or ''}  ·  Presupuesto: {b.budget}"], 12)
        elif isinstance(b, StatusList):
            self.heading(b.title)
            self.bullets([f"{i.value} · {clean(i.text)}" for i in b.items])
        elif isinstance(b, NumberedCards):
            self.heading(b.title)
            self.bullets([f"{i.n} {clean(i.text)}".strip() for i in b.items])
        elif isinstance(b, StepCards):
            self.heading(b.header or b.title)
            self.bullets([f"{i.n} · {i.tag} ({i.date}) — {clean(i.title)}: {clean(i.text)}" for i in b.items])
        elif isinstance(b, LinkCards):
            self.heading(b.title)
            self.bullets([f"{i.n} · {clean(i.title)}: {clean(i.text)}" + (f" ({i.button.url})" if i.button.url else "") for i in b.items])
        elif isinstance(b, Grid):
            for col in b.columns:
                for x in col:
                    self.block(x)
        elif isinstance(b, Group):
            for x in b.blocks:
                self.block(x)
        elif isinstance(b, (Budget, CalendarBlock, Proposals, Gallery, MediaBlock)):
            pass  # presupuesto, calendario, propuestas y multimedia viven mejor en el HTML

    # ── informe ──
    def build(self) -> bytes:
        rep, m = self.rep, self.rep.meta
        self.s = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        self.rect(0, 0, W, H, self.navy)
        self.rect(0, 4.1, W, 0.08, GOLD)
        self.text(0.9, 1.6, W - 1.8, 0.5, m.org.upper(), 16, True, GOLD)
        self.text(0.9, 2.2, W - 1.8, 1.0, m.title, 40, True, RGBColor(255, 255, 255))
        self.text(0.9, 3.2, W - 1.8, 0.8, m.subtitle, 28, True, GOLD)
        if m.boss:
            self.text(0.9, 4.5, W - 1.8, 0.5, f"{m.boss_role}: {m.boss}", 16, False, RGBColor(0xD9, 0xDE, 0xE8))
        for s in rep.sections:
            if s.hidden:
                continue
            self.new(clean(s.title), clean(s.subtitle))
            for b in s.blocks:
                self.block(b)
            for t in [x for tt in s.tabs for x in [tt, *tt.tabs]]:
                vis = [b for b in t.blocks if not b.hidden and not isinstance(b, (Budget, CalendarBlock, Proposals, Gallery, MediaBlock))]
                if not vis:
                    continue
                self.need(1.0)
                if clean(getattr(vis[0], "header", "") or "").lower() != clean(t.label).lower():
                    self.heading(t.label)
                for b in vis:
                    self.block(b)
        if rep.alerts and m.show_alerts:
            self.new("Alertas de todos los grupos", f"{len(rep.alerts)} alertas")
            order = {"alto": 0, "medio": 1, "bajo": 2}
            self.table(["Nivel", "Grupo", "Alerta"], [[a.level.capitalize(), a.group, a.text] for a in sorted(rep.alerts, key=lambda a: order.get(a.level, 3))], [1, 2, 9], 10)
        buf = io.BytesIO()
        self.prs.save(buf)
        return buf.getvalue()


def to_pptx(rep: Report) -> bytes:
    return Deck(rep).build()
