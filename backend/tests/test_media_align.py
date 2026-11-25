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
    assert 'id="rs-xmas"' in html and 'data-tema="navidad"' in html and 'data-it="Enciende lo que nos une"' in html and "xm-replay" in html
