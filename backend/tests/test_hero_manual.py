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


def test_cifras_del_inicio_por_grupos():
    d = json.load(open("seed/report.seed.json"))
    d["meta"]["hero_mode"] = "grupos"
    rep, issues = load(d)
    assert rep is not None, issues
    h = render(rep)
    assert '/*@HERO*/null' not in h and "Actos" in h or "actos" in h
    assert h.count('"v":') >= 4


def test_ocultar_tarjetas_de_inicio():
    import json, pathlib
    from app.render import render
    from app.validate import load
    seed = json.loads((pathlib.Path(__file__).resolve().parents[2] / "seed/report.seed.json").read_text(encoding="utf-8"))
    rep, _ = load(seed)
    full = render(rep)
    assert 'id="homePT"' in full and 'id="homePRES"' in full
    rep.sections[0].home.hidden = True
    rep.meta.home_hide = ["pt", "pres"]
    html = render(rep)
    assert 'id="homePT"' not in html and 'id="homePRES"' not in html
    assert html.count('class="card gcard" data-go=') == full.count('class="card gcard" data-go=') - 1
