import json
import re
import subprocess
from pathlib import Path

import pytest

from app.render import render
from app.schema import ChartKind
from app.validate import load
from typing import get_args

ROOT = Path(__file__).resolve().parents[2]


def demo():
    subprocess.run(["python3", "-I", str(ROOT / "scripts/make_charts_demo.py")], check=True, capture_output=True)
    return json.loads((ROOT / "seed/charts_demo.json").read_text(encoding="utf-8"))


def charts(d):
    out = []
    def walk(bs):
        for b in bs:
            if b["type"] == "chart":
                out.append(b)
            if b["type"] == "grid":
                for c in b["columns"]:
                    walk(c)
    for s in d["sections"]:
        walk(s.get("blocks", []))
    return out


def test_demo_covers_every_kind_and_validates():
    d = demo()
    assert {c["kind"] for c in charts(d)} == set(get_args(ChartKind))
    rep, issues = load(d)
    assert issues == [] and rep is not None


def test_render_embeds_engine_only_when_charts_exist():
    d = demo()
    rep, _ = load(d)
    html = render(rep)
    assert len(re.findall(r'class="rs-chart"', html)) == len(charts(d))
    assert "RSCharts" in html
    seed = json.loads((ROOT / "seed/report.seed.json").read_text(encoding="utf-8"))
    rep2, _ = load(seed)
    assert "RSCharts" not in render(rep2)   # sin gráficos, el informe no carga el motor


@pytest.mark.parametrize("mut,frag", [
    (lambda c: c.update(kind="bar", labels=["a", "b"], series=[{"name": "s", "values": [1]}]), "tiene 1 valores"),
    (lambda c: c.update(kind="candles", labels=["a"], series=[{"name": "s", "ohlc": [[5, 4, 6, 5]]}]), "máximo debe ser el mayor"),
    (lambda c: c.update(kind="gantt", events=[{"label": "x", "start": "2026-02-01", "end": "2026-01-01"}]), "termina antes"),
    (lambda c: c.update(kind="timeline", events=[{"label": "x", "start": "01/02/2026"}]), "AAAA-MM-DD"),
    (lambda c: c.update(kind="pie", labels=["a"], series=[{"name": "s", "values": [-1]}]), "negativos"),
    (lambda c: c.update(kind="radar", labels=["a", "b"], series=[{"name": "s", "values": [1, 2]}]), "3 etiquetas"),
    (lambda c: c.update(kind="scatter", series=[{"name": "s"}]), "puntos"),
])
def test_chart_validation(mut, frag):
    d = demo()
    c = charts(d)[0]
    mut(c)
    _, issues = load(d)
    assert any(frag in i for i in issues), issues


def test_all_kinds_draw_in_a_real_browser(tmp_path):
    pw = pytest.importorskip("playwright.sync_api")
    rep, _ = load(demo())
    f = tmp_path / "d.html"
    f.write_text(render(rep), encoding="utf-8")
    errs = []
    with pw.sync_playwright() as p:
        try:
            b = p.chromium.launch()
        except Exception:
            pytest.skip("Chromium no instalado")
        pg = b.new_page(viewport={"width": 1300, "height": 900})
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f.as_uri())
        pg.wait_for_timeout(400)
        pg.evaluate("document.getElementById('iGo')&&document.getElementById('iGo').click()")
        pg.evaluate("document.querySelector('.tab[data-t=graficos]').click()")
        pg.wait_for_timeout(1500)
        n = pg.locator(".rs-chart svg").count()
        bad = pg.locator(".rs-chart p").count()
        empty = pg.evaluate("[...document.querySelectorAll('.rs-chart svg')].filter(s=>s.querySelectorAll('path,rect,circle,polygon,line,text').length<3).length")
        b.close()
    assert errs == [] and n == 24 and bad == 0 and empty == 0, (errs, n, bad, empty)
