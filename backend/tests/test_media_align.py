from app.render import fig_style
from app.schema import Media


def test_centrada_por_defecto():
    assert "margin-left:auto;margin-right:auto;text-align:center" in fig_style(Media())


def test_izquierda_y_ancho():
    s = fig_style(Media(align="left", width=400))
    assert "max-width:400px" in s and "margin-left:0" in s and "margin-right:auto" in s


def test_adjunto_en_cualquier_casilla():
    import json, pathlib
    from app.render import render
    from app.validate import load
    seed = json.loads((pathlib.Path(__file__).resolve().parents[2] / "seed/report.seed.json").read_text(encoding="utf-8"))
    rep, _ = load(seed)
    b = rep.sections[0].blocks[0] if rep.sections[0].blocks else rep.sections[0].tabs[0].blocks[0]
    b.embed = Media(kind="video", slot="v.mp4", src="https://x/v.mp4")
    for pos in ("top", "bottom", "left", "right"):
        b.embed_pos = pos
        assert '<video class="pimg" src="https://x/v.mp4"' in render(rep)


def test_botones_anidados():
    import json, pathlib
    from app.render import render
    from app.validate import load
    seed = json.loads((pathlib.Path(__file__).resolve().parents[2] / "seed/report.seed.json").read_text(encoding="utf-8"))
    bien = next(s for s in seed["sections"] if s["id"] == "bienestar")
    bien["tabs"] = [{"id": "enciende", "label": "Enciende lo que nos une", "blocks": [], "tabs": [
        {"id": "lunes", "label": "Lunes", "blocks": [{"type": "callout", "text": "Texto del lunes"}]},
        {"id": "carrito", "label": "Carrito", "blocks": [{"type": "callout", "text": "Texto del carrito"}]}]}]
    rep, issues = load(seed)
    html = render(rep)
    assert 'data-s2="lunes"' in html and 'data-sub2="carrito"' in html and "Texto del carrito" in html
    assert "sections" in render(rep, edit=True) and 'tabs.0.tabs.1.blocks' in render(rep, edit=True)


def test_tema_navidad_solo_viaja_si_se_usa():
    import json, pathlib
    from app.render import render
    from app.validate import load
    seed = json.loads((pathlib.Path(__file__).resolve().parents[2] / "seed/report.seed.json").read_text(encoding="utf-8"))
    rep, _ = load(seed)
    assert 'id="rs-xmas"' not in render(rep)
    bien = next(s for s in seed["sections"] if s["id"] == "bienestar")
    bien["tabs"].append({"id": "nav", "label": "Enciende lo que nos une", "tema": "navidad", "blocks": []})
    rep, _ = load(seed)
    html = render(rep)
    assert 'id="rs-xmas"' in html and 'data-tema="navidad"' in html and 'data-it="Navidad en Presidencia"' in html and 'data-is="Enciende lo que nos une"' in html and "xm-replay" in html


def test_bloque_texto_libre():
    from app.render import render
    from app.schema import Report
    import json
    from pathlib import Path
    rep = Report.model_validate(json.loads((Path(__file__).resolve().parents[2] / "seed/report.seed.json").read_text(encoding="utf-8")))
    sec = rep.sections[0]
    tab = sec.tabs[0] if sec.tabs else None
    from app.schema import Tab, TextBlock
    if tab is None:
        tab = Tab(id="tt", label="T", blocks=[])
        sec.tabs.append(tab)
    tab.blocks.append(TextBlock(id="txt1", title="Mi título", text="Primer párrafo con **negrilla**.\n\nSegundo párrafo."))
    html = render(rep)
    assert "Primer párrafo con <b>negrilla</b>." in html and "Segundo párrafo." in html and "Mi título" in html


def test_estilo_por_casilla():
    import json
    from pathlib import Path
    from app.render import render
    from app.schema import Report, StatGrid, Stat
    rep = Report.model_validate(json.loads((Path(__file__).resolve().parents[2] / "seed/report.seed.json").read_text(encoding="utf-8")))
    blk = StatGrid(id="eg1", items=[Stat(value="71 %", label="Cumplimiento")], font="georgia", escala=130, text_align="center")
    rep.sections[0].tabs[0].blocks.append(blk) if rep.sections[0].tabs else rep.sections[0].__dict__.setdefault("x", 1)
    if not rep.sections[0].tabs:
        from app.schema import Tab
        rep.sections[0].tabs.append(Tab(id="tt", label="T", blocks=[blk]))
    html = render(rep)
    assert "zoom:1.3;" in html and "Georgia" in html and "text-align:center;" in html


def test_estilo_predeterminado_usa_la_paleta():
    import json
    from pathlib import Path
    from app.render import render
    from app.schema import Report, StatGrid, Stat, Tab
    rep = Report.model_validate(json.loads((Path(__file__).resolve().parents[2] / "seed/report.seed.json").read_text(encoding="utf-8")))
    rep.sections[0].tabs.append(Tab(id="lkx", label="L", blocks=[StatGrid(id="lk1", items=[Stat(value=5, label="x")], look="degradado")]))
    html = render(rep)
    assert 'class="rs-lk rs-l-degradado"' in html and ".rs-l-degradado{--h:" in html and "var(--navy)" in html
    import re
    assert len(re.findall(r"<style\b", html)) == html.count("</style>")


def test_imagen_con_tamano_contenido():
    from app.render import media_tag
    from app.schema import Media
    assert "max-height:360px" in media_tag(Media(kind="image", src="/media/x.jpg"))
    assert "max-height:200px" in media_tag(Media(kind="image", src="/media/x.jpg", size="pequena"))
    assert "max-height:700px" in media_tag(Media(kind="image", src="/media/x.jpg", size="xl"))
    assert "max-height:900px" in media_tag(Media(kind="image", src="/media/x.jpg", size="xxl"))
    assert "max-height" not in media_tag(Media(kind="image", src="/media/x.jpg", size="completa"))
