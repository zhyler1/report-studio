from app.render import fig_style
from app.schema import Media


def test_centrada_por_defecto():
    assert "margin-left:auto;margin-right:auto;text-align:center" in fig_style(Media())


def test_izquierda_y_ancho():
    s = fig_style(Media(align="left", width=400))
    assert "max-width:400px" in s and "margin-left:0" in s and "margin-right:auto" in s
