"""Convierte el informe actual (HTML escrito a mano) + datos_informe.json al formato de Report Studio.

Uso:  python scripts/migrate_seed.py seed/Informe_TH.original.html seed/datos_informe.json seed/report.seed.json
El texto se extrae del HTML tal cual (sin reescribir) para que el informe generado diga lo mismo.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

from .schema import *  # noqa
from .validate import load


def plain(el) -> str:
    return " ".join(el.get_text().replace("\xa0", " ").split())


def rich(el) -> str:
    def walk(n) -> str:
        if isinstance(n, NavigableString):
            return str(n)
        if n.name == "br":
            return "\n"
        inner = "".join(walk(c) for c in n.children)
        return f"**{inner.strip()}**" if n.name in ("b", "strong") and inner.strip() else inner
    t = walk(el).replace("\xa0", " ")
    t = re.sub(r"[ \t\r\f\v]+", " ", t)
    t = re.sub(r" ?\n ?", "\n", t)
    return t.strip()


def money_to_int(s: str) -> int:
    return int(re.sub(r"\D", "", s.split(",")[0]) or 0)


def style_var(el, var):
    m = re.search(r"--%s:\s*([^;\"]+)" % var, el.get("style", ""))
    return m.group(1).strip() if m else None


def stat_of(card) -> Stat:
    num = card.select_one(".num")
    lbl = card.select_one(".lbl")
    to = num.get("data-to")
    long_ = "long" in num.get("class", [])
    if to is not None:
        return Stat(value=int(to), label=plain(lbl), prefix=num.get("data-pre", ""), suffix=num.get("data-suf", ""), long=long_)
    return Stat(value=plain(num), label=plain(lbl), animate=False, long=long_)


def min_width(el, default):
    m = re.search(r"minmax\((\d+)px", el.get("style", ""))
    return int(m.group(1)) if m else default


def rows_block(panel) -> RowList:
    head = panel.select_one(".evh")
    hdr = plain(panel.select_one(".bar-h"))
    cols = tuple(plain(s) for s in head.select("span"))
    items = []
    for r in panel.select(".rows .row"):
        body = r.select("div")[1]
        ps = body.find_all("p", recursive=False)
        bar = body.select_one(".bar")
        items.append(RowItem(n=plain(r.select_one(".n")), title=plain(body.select_one("b.t")),
                             text="\n".join(rich(p) for p in ps), evidence=plain(r.select_one(".ev")),
                             bar_pct=float(re.search(r"([\d.]+)%", bar["style"]).group(1)) if bar else None))
    return RowList(header=hdr, columns=cols, items=items)


def build(html: str, data: dict) -> Report:
    soup = BeautifulSoup(html, "lxml")
    BIEN, PT, AL, ACU, PER, DEV = (data[k] for k in ("BIEN", "PT", "AL", "ACU", "PER", "DEV"))
    pres = soup.select_one("#presBox")

    def head(pid):
        p = soup.select_one(f"#p-{pid}")
        t = p.select_one(".ptitle")
        return plain(t.select_one("h2")), plain(t.select_one("p"))

    home = {}
    for c in soup.select("#homeCards .gcard[data-go]"):
        g = c["data-go"]
        if g == "alertas":
            continue
        stats = [stat_of(s) for s in c.select(".stat")]
        txt = plain(c.select_one("p.muted")) if c.select_one("p.muted") else ""
        tag = c.select_one(".tag-v")
        grid_el = c.select_one(".grid")
        cols = len(re.findall(r"1fr", grid_el["style"])) if grid_el and grid_el.get("style") else 0
        home[g] = HomeCard(title=plain(c.select_one("h3")), columns=cols, stats=stats, text=txt, tag=plain(tag) if tag else "",
                           tag_tone="green" if tag and "46,125,50" in tag.get("style", "") else "red")
    # valores calculados (el renderizador los recalcula desde los datos)
    home["personal"].stats[0].bind = "plants.first_total"
    home["personal"].stats[1].bind = "plants.procesos"
    home["personal"].stats[2].bind = "plants.posesiones"
    home["bienestar"].stats[0].bind = "act.total"
    home["bienestar"].stats[0].label = pres["data-totlabel"]
    home["bienestar"].tag = "Presupuesto {act.budget}"

    # ── Personal
    t, st = head("personal")
    p = soup.select_one("#p-personal")
    sig = []
    for tr in p.select("table tbody tr"):
        td = tr.select("td")
        sig.append({"codigo": plain(td[0]), "estado": plain(td[1]), "avance": float(re.search(r"([\d.]+)%", td[2].select_one(".bar")["style"]).group(1)), "cierre": plain(td[3])})
    left = p.select("div.grid.g2.sec > div")[0]
    right = p.select("div.grid.g2.sec > div.stk")[0]
    sit = left.select_one(".card")
    acc = right.select_one(".card")
    ptc = right.select_one(".ptcard")
    plants = Plants(plants=[Plant(label=a, provistos=b, vacantes=c) for a, b, c in PER["plantas"]], procesos=PER["procesos"],
                    procesos_label=PER["procLabel"], posesiones=PER["posesiones"], posesiones_label=PER["posLabel"], logro=PER["logro"])
    wf = Workflow(heading=plain(ptc.select_one("h3")), modal_title=plain(soup.select_one("#pt .pt-title")), subtitle=soup.select_one("#pt .pt-top > p").get_text(strip=True),
                  teaser=plain(ptc.select_one("p.muted")), button_label=plain(ptc.select_one("button")),
                  steps=[WorkflowStep(n=r[0], title=r[1], owner=r[2], status=r[3], times=r[4], hours=r[5], other=r[6]) for r in PT])
    grid = Grid(ratio=[1, 1], columns=[
        [Table(title=plain(left.select_one("h3.st")), columns=[Column(key="codigo", label="Código"), Column(key="estado", label="Estado", format="pill"),
                                                                  Column(key="avance", label="Avance", format="pct_bar"), Column(key="cierre", label="Fecha de cierre")], rows=sig),
         CardList(title=plain(sit.select_one("h3")), style="plain", items=[rich(li) for li in sit.select("li")])],
        [CardList(title=plain(right.select_one("h3.st")), style="checks", items=[rich(li) for li in acc.select("li")]), wf],
    ])
    agr = Agreement(heading=ACU["titulo"], cutoff=ACU["corte"], avg=ACU["prom"], color="green", summary=ACU["texto"],
                    milestone_date=ACU["hitoFecha"], milestone=[x[0] for x in ACU["hito"]],
                    progress=[x[0] for x in ACU["avances"]], watch=[x[0] for x in ACU["aspectos"]])
    personal = Section(id="personal", label="Gestión de Personal", title=t, subtitle=st, icon="people", home=home["personal"],
                       blocks=[Plants(title=plain(p.select_one("h3.st")), **plants.model_dump(exclude={"type", "id", "title", "hidden"})), grid, agr])

    # ── Nómina
    t, st = head("nomina")
    p = soup.select_one("#p-nomina")
    g4 = p.select_one(".grid.g4")
    nomina = Section(id="nomina", label="Nómina", title=t, subtitle=st, icon="stock", home=home["nomina"],
                     blocks=[StatGrid(items=[stat_of(c) for c in g4.select(".card.stat")], min_width=min_width(g4, 270)), rows_block(p)])

    # ── Bienestar
    t, st = head("bienestar")
    p = soup.select_one("#p-bienestar")
    esc_ = p.select_one('[data-sub="escucha"]')
    im = esc_.select_one("figure img")
    steps = [StepCard(n=plain(s.select_one(".big")), tag=plain(s.select_one(".tag")), date=plain(s.select_one(".date")),
                      title=plain(s.select_one("h4")), text=plain(s.select_one("p"))) for s in esc_.select(".step")]
    sc = StepCards(header=plain(esc_.select_one(".bar-h")), items=steps,
                   media=Media(slot=im["data-slot"], src=im["src"], alt=im["alt"], height=int(im["data-h"]), caption=plain(esc_.select_one("figcaption"))))
    acts = Activities(id="act", title=plain(p.select_one('[data-sub="actividades"] .bar-h')), items=[Activity(measure=r[0], name=r[1], frequency=r[2], pct=r[3], date=r[4], note=r[5], value=r[6]) for r in BIEN],
                      budget=pres["data-budget"], total=pres.get("data-total", ""), total_label=pres["data-totlabel"])
    prop = p.select_one('[data-sub="propuestas"]')
    heads = [plain(b) for b in prop.select(".bar-h")]
    imgs = prop.select("img")
    mk = lambda i: Media(slot=i["data-slot"], src=i["src"], alt=i["alt"], height=int(i["data-h"]), caption="")
    prp = Proposals(ancheta_title=heads[0], velitas_title=heads[1], ancheta=DEV["anc"], velitas=DEV["vel"], vacations=DEV["vac"], bonus=DEV["bon"],
                    ancheta_media=mk(imgs[0]), velitas_media=mk(imgs[1]), velitas_note=plain(prop.select_one(".note")))
    bien = Section(id="bienestar", label="Bienestar y Desarrollo", title=t, subtitle=st, icon="heart", home=home["bienestar"], tabs=[
        Tab(id="escucha", label=plain(p.select_one('.sbtn[data-s="escucha"]')), blocks=[sc]),
        Tab(id="actividades", label="Actividades", blocks=[acts]),
        Tab(id="calendario", label="Calendario", blocks=[CalendarBlock(source="act", title="CALENDARIO · Actividades de Bienestar")]),
        Tab(id="presupuesto", label="Presupuesto", blocks=[Budget(title=plain(p.select_one('[data-sub="presupuesto"] .bar-h')), source="act")]),
        Tab(id="propuestas", label="Propuestas", blocks=[prp]),
    ])

    # ── Comunicación
    t, st = head("comunicacion")
    p = soup.select_one("#p-comunicacion")
    lcs = []
    for c in p.select(".lcard"):
        a = c.select_one("a.lbtn")
        btn = Button(label=plain(a), url=a.get("href", ""), note=a.get("data-pending", "")) if a else Button(label=plain(c.select_one("span.lbtn")), disabled=True)
        lcs.append(LinkCard(n=plain(c.select_one(".lnum")), title=plain(c.select_one("h3")), text=plain(c.select_one("p.muted")), button=btn))
    sec2 = p.select_one(".sec")
    gal = Gallery(title=plain(sec2.select_one("h3.st")),
                  items=[Media(slot=f.select_one("img")["data-slot"], src=f.select_one("img")["src"], alt=f.select_one("img")["alt"], height=int(f.select_one("img")["data-h"]), caption=plain(f.select_one("figcaption"))) for f in sec2.select("figure")],
                  side_card=InfoCard(title=plain(sec2.select_one(".card h3")), items=[rich(li) for li in sec2.select(".card li")]))
    comu = Section(id="comunicacion", label="Comunicación Interna", title=t, subtitle=st, icon="radio", home=home["comunicacion"], blocks=[LinkCards(items=lcs), gal])

    # ── Historias
    t, st = head("historias")
    p = soup.select_one("#p-historias")
    g4 = p.select_one(".grid.g4")
    hist = Section(id="historias", label="Historias Laborales", title=t, subtitle=st, icon="doc", home=home["historias"], blocks=[
        StatGrid(items=[stat_of(c) for c in g4.select(".card.stat")], min_width=min_width(g4, 190)), rows_block(p),
        NoteList(header=plain(p.select_one(".obs").find_previous_sibling(class_="bar-h")), items=[rich(li) for li in p.select(".obs li")])])
    # ── SST
    t, st = head("sst")
    p = soup.select_one("#p-sst")
    cmap = {"var(--red)": "red", "var(--yellow)": "yellow", "var(--blue)": "blue"}
    arl = p.select(".arl-i")
    items = []
    for a in arl:
        col = re.search(r"border-left-color:\s*([^;\"]+)", a["style"]).group(1).strip()
        items.append(StatusItem(value=plain(a.select_one("b.num")), text=rich(a.select_one("span:not(.num)")), color=cmap.get(col, "blue")))
    ring = p.select_one(".ring.big")
    sst_secs = p.select(".sec")
    g2 = p.select_one(".grid.g2")
    sstg = Grid(ratio=[1, 1], columns=[[RingCard(value=float(ring["data-p"]), text=plain(g2.select_one(".card p")), color="yellow")],
                                       [StatusList(title=plain(g2.select_one(".card h3")), items=items)]])
    sst = Section(id="sst", label="Seguridad y Salud en el Trabajo", title=t, subtitle=st, icon="shield", home=home["sst"], blocks=[
        sstg.model_copy(update={"title": plain(p.select_one("h3.st"))}),
        NumberedCards(title=plain(sst_secs[0].select_one("h3.st")), items=[NumberedCard(n=plain(c.select_one(".sn")), text=plain(c.select_one("p"))) for c in sst_secs[0].select(".salert")]),
        NumberedCards(title=plain(sst_secs[1].select_one("h3.st")), items=[NumberedCard(text=rich(c.select_one("p")), tone="violet") for c in sst_secs[1].select(".card.t4")], min_width=300)])

    meta = Meta(title="Seguimiento Interno", subtitle="Oficina de Talento Humano", org="Presidencia de la República",
                tagline=plain(soup.select_one(".hsub")), boss=plain(soup.select_one(".i-boss b")), boss_role=plain(soup.select_one(".i-boss span")),
                hero_kicker=plain(soup.select_one(".hero > small")), hero_title=plain(soup.select_one(".hero h2")), hero_text=plain(soup.select_one(".hero p")),
                footer=plain(soup.select_one("footer")), share_url=re.search(r"var ART='([^']+)'", html).group(1),
                theme=Theme(logo_dark=soup.select_one(".hlogo img")["data-dark"], logo_light=soup.select_one(".hlogo img")["data-light"],
                            intro_word=soup.select_one("#iTitle")["data-word"],
                            palace_url="https://commons.wikimedia.org/wiki/Special:FilePath/Costado2_Casa_de_Nari%C3%B1o.jpg?width=1600"))
    return Report(meta=meta, sections=[personal, nomina, bien, comu, hist, sst], alerts=[Alert(group=a[0], level=a[1], text=a[2]) for a in AL])


def main(a):
    html = Path(a[0]).read_text(encoding="utf-8")
    data = json.loads(Path(a[1]).read_text(encoding="utf-8"))
    rep = build(html, data)
    doc = rep.model_dump(mode="json", exclude_none=True)
    rep2, issues = load(doc)
    if issues:
        raise SystemExit("\n".join(issues))
    Path(a[2]).write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    print("ok", a[2], len(json.dumps(doc)), "bytes")


if __name__ == "__main__":
    main(sys.argv[1:])


def markers(html: str) -> dict | None:
    """Datos del informe escrito a mano: viven entre /*@BIEN*/…/*@/BIEN*/ (y PT, AL, ACU, PER, DEV)."""
    out = {}
    for k in ("BIEN", "PT", "AL", "ACU", "PER", "DEV"):
        m = re.search(r"/\*@%s\*/(.*?)/\*@/%s\*/" % (k, k), html, re.S)
        if not m:
            return None
        try:
            out[k] = json.loads(m.group(1))
        except ValueError:
            return None
    return out


def from_html(html: str) -> dict | None:
    """Convierte nuestro informe HTML (el escrito a mano) en un informe de Report Studio; None si no tiene esa estructura."""
    data = markers(html)
    if not data:
        return None
    try:
        rep = build(html, data)
        doc = rep.model_dump(mode="json", exclude_none=True)
        return doc if load(doc)[0] else None
    except Exception:
        return None
