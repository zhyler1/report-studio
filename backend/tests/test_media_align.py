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
