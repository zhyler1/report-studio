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
