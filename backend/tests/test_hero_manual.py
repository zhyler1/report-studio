import json
from app.render import render
from app.validate import load


def _rep(hero):
    d = json.load(open("seed/report.seed.json"))
    if hero is not None:
        d["meta"]["hero_stats"] = hero
    rep, issues = load(d)
    assert rep is not None, issues
    return render(rep)


def test_cifras_del_inicio_automaticas_por_defecto():
    assert '/*@HERO*/null/*@/HERO*/' in _rep(None)


def test_cifras_del_inicio_a_mano():
    h = _rep([{"value": 869, "label": "Planta permanente"}, {"value": "$ 59.808.760", "label": "Cartera de incapacidades"}])
    assert '"v":869' in h and "Cartera de incapacidades" in h and '/*@HERO*/null' not in h
