"""El renderizador debe reproducir la plantilla visual v9 a partir del JSON."""
import json
import re
import subprocess
from pathlib import Path

import pytest

from app.render import render
from app.validate import load

ROOT = Path(__file__).resolve().parents[2]
SEED = json.loads((ROOT / "seed/report.seed.json").read_text(encoding="utf-8"))
V9 = (ROOT / "seed/Informe_TH.v9.html").read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def html():
    rep, issues = load(SEED)
    assert not issues, issues
    return render(rep)


def marker(src, name):
    return re.search(r"/\*@%s\*/(.*?)/\*@/%s\*/" % (name, name), src, re.S).group(1)


@pytest.mark.parametrize("name", ["BIEN", "PT", "AL", "DEV", "ACU", "PER"])
def test_data_markers_equal_v9(html, name):
    assert json.loads(marker(html, name)) == json.loads(marker(V9, name))


def test_no_unresolved_placeholders(html):
    assert "@@" not in html


def test_escapes_script_end(html):
    rep, _ = load(SEED)
    rep.alerts[0].text = "x </script> y"
    assert "</script> y" not in marker(render(rep), "AL")


def test_panel_text_equals_v9_in_jsdom(html, tmp_path):
    p = tmp_path / "r.html"
    p.write_text(html, encoding="utf-8")
    if not Path("/tmp/jt/t3.js").exists():
        pytest.skip("sin jsdom")
    out = subprocess.run(["node", "/tmp/jt/t3.js"], cwd="/tmp/jt", env={**__import__("os").environ, "R": str(p)}, capture_output=True, text=True, timeout=60).stdout
    assert "paneles distintos: 0" in out and "errores: 0" in out, out
