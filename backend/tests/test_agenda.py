from app.render import parse_agenda, render
from app.schema import AgendaBlock, Report
import json
from pathlib import Path


def test_parser_entiende_formatos():
    ev, bad = parse_agenda("2026-12-07 | Velitas | Patio | Cultura\n05/12/2026 | Novena\n18/12/2026-19/12/2026 | Salud | Piso 1 | Salud\n2026-12-9..2026-12-11 | Taller\n# comentario\n\nsin fecha | X\n2026-02-30 | Imposible")
    assert [e["t"] for e in ev] == ["Novena", "Velitas", "Taller", "Salud"]
    assert ev[0]["d"] == "2026-12-05" and ev[2]["e"] == "2026-12-11" and ev[3]["e"] == "2026-12-19"
    assert ev[1]["x"] == "Patio" and ev[1]["c"] == "Cultura"
    assert len(bad) == 2


def test_rango_invertido_se_ordena():
    ev, _ = parse_agenda("2026-12-10..2026-12-08 | Taller")
    assert ev[0]["d"] == "2026-12-08" and ev[0]["e"] == "2026-12-10"


def test_bloque_viaja_con_su_motor():
    r = json.loads((Path(__file__).parents[2] / "seed" / "report.seed.json").read_text(encoding="utf-8"))
    r["sections"][0]["blocks"].append(AgendaBlock(id="ag1", title="Calendario").model_dump(mode="json"))
    html = render(Report.model_validate(r))
    assert 'class="rs-ag"' in html and "RSAgenda" in html and ".ag-grid" in html
    assert "Novena de aguinaldos" in html


def test_ventana_emergente_lleva_su_contenido_y_su_motor():
    from app.schema import PopupBlock, TextBlock
    r = json.loads((Path(__file__).parents[2] / "seed" / "report.seed.json").read_text(encoding="utf-8"))
    p = PopupBlock(id="pp1", label="Ver cronograma", modal_title="Cronograma", blocks=[TextBlock(id="tp1", text="Contenido de la ventana")])
    r["sections"][0]["blocks"].append(p.model_dump(mode="json"))
    rep = Report.model_validate(r)
    html = render(rep)
    assert 'class="rs-pp-src"' in html and 'data-title="Cronograma"' in html and "Contenido de la ventana" in html and "#rsPP" in html
    ed = render(rep, edit=True)
    assert "Contenido de la ventana «Cronograma»" in ed and 'data-addto="' in ed


def test_titulo_vacio_deja_marcador_para_seleccionar_en_edicion():
    from app.schema import Heading
    r = json.loads((Path(__file__).parents[2] / "seed" / "report.seed.json").read_text(encoding="utf-8"))
    r["sections"][0]["blocks"].append(Heading(id="h0", title=None).model_dump(mode="json"))
    rep = Report.model_validate(r)
    assert "rs-notitle" in render(rep, edit=True) and "rs-notitle" not in render(rep)


def test_texto_con_formato_se_limpia_y_se_dibuja():
    from app.render import clean_html
    from app.schema import TextBlock
    sucio = '<p style="color:#c00;position:fixed">Hola <b onclick="x()">mundo</b><script>alert(1)</script><a href="javascript:alert(1)">mal</a><a href="ejemplo.com">bien</a></p><iframe src=x></iframe>'
    out = clean_html(sucio)
    assert "script" not in out and "iframe" not in out and "onclick" not in out and "javascript" not in out and "position" not in out
    assert "<b>mundo</b>" in out and 'href="https://ejemplo.com"' in out and "color:#c00" in out
    r = json.loads((Path(__file__).parents[2] / "seed" / "report.seed.json").read_text(encoding="utf-8"))
    r["sections"][0]["blocks"].append(TextBlock(id="tf1", text="Hola mundo", html="<p>Hola <b>mundo</b></p><ul><li>uno</li></ul>").model_dump(mode="json"))
    html = render(Report.model_validate(r))
    assert 'class="rs-txt rs-rich"' in html and "<li>uno</li>" in html
