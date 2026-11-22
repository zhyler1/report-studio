import pytest
from app.render import render, pct_num
from app.validate import load
from app.starters import STARTERS


@pytest.mark.parametrize("v,esp", [(80, 80.0), ("80 %", 80.0), ("80,5%", 80.5), (None, None), ("", None), ("sin dato", None)])
def test_pct_num(v, esp):
    assert pct_num(v) == esp


@pytest.mark.parametrize("v", [80, "80 %", None, "", "sin dato"])
def test_tabla_avance_no_revienta(v):
    d = STARTERS[0]["data"]
    import copy
    d = copy.deepcopy(d)
    sec = d["sections"][0]
    sec["blocks"].append({"type": "table", "title": "A", "columns": [{"key": "a", "label": "Av", "format": "pct_bar"}], "rows": [{"a": v}]})
    rep, _ = load(d)
    assert rep is not None
    assert "<table" in render(rep)
