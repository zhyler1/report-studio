import json, re
from pathlib import Path
from bs4 import BeautifulSoup
from app.schema import Report, Grid, json_schema
from app.validate import load, all_blocks, check

ROOT = Path(__file__).resolve().parents[2]
SEED = json.loads((ROOT / "seed/report.seed.json").read_text(encoding="utf-8"))
HTML = (ROOT / "seed/Informe_TH.original.html").read_text(encoding="utf-8")
DATA = (ROOT / "seed/datos_informe.json").read_text(encoding="utf-8")


def norm(s):
    return re.sub(r"\s+", " ", s.replace("\xa0", " ").replace("**", "").replace("\n", " ")).strip()


def test_seed_is_valid():
    rep, issues = load(SEED)
    assert rep is not None and issues == []


def test_sections_and_counts():
    rep, _ = load(SEED)
    assert [s.id for s in rep.sections] == ["personal", "nomina", "bienestar", "comunicacion", "historias", "sst"]
    assert len(rep.alerts) == 23
    assert rep.meta.show_alerts is False
    bien = rep.sections[2]
    assert [t.id for t in bien.tabs] == ["escucha", "actividades", "calendario", "presupuesto", "propuestas"]
    acts = next(b for b in all_blocks(rep) if b.type == "activities")
    assert len(acts.items) == 15 and acts.budget == "$ 844.784.981"


def test_roundtrip_is_stable():
    rep, _ = load(SEED)
    again = rep.model_dump(mode="json", exclude_none=True)
    assert again == SEED


def test_every_text_comes_from_the_original_report():
    """Ningún texto del seed se inventa: todo aparece en el HTML o en datos_informe.json."""
    text = norm(BeautifulSoup(HTML, "lxml").get_text(" ")) + " " + norm(DATA) + " " + norm(HTML)
    skip = {"type", "id", "url", "src", "slot", "poster", "icon", "color", "status", "style", "tone", "kind", "level", "group", "key", "format",
            "align", "source", "bind", "tag_tone", "schema_version", "default", "cover", "palace_url", "logo_dark", "logo_light", "share_url", "show"}
    missing = []

    def walk(v, k=""):
        if isinstance(v, dict):
            for kk, vv in v.items():
                walk(vv, kk)
        elif isinstance(v, list):
            for x in v:
                walk(x, k)
        elif isinstance(v, str) and k not in skip and len(v) > 3:
            for piece in norm(v).split("  "):
                if piece and piece not in text:
                    missing.append((k, v[:70]))

    walk(SEED)
    # los textos de plantilla (etiquetas fijas del esquema) no cuentan como faltantes
    allowed = {"Presupuesto {act.budget}", "Código", "Estado", "Avance", "Fecha de cierre", "Calendario", "CALENDARIO · Actividades de Bienestar"}
    missing = [m for m in missing if m[1] not in allowed]
    assert missing == [], missing


def test_json_schema_exports():
    s = json_schema()
    assert "Report" in json.dumps(s) or "$defs" in s
    (ROOT / "schema/report.schema.json").write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding="utf-8")


def test_checks_catch_problems():
    bad = json.loads(json.dumps(SEED))
    bad["alerts"][0]["group"] = "inexistente"
    rep, issues = load(bad)
    assert any("inexistente" in i for i in issues)
    bad2 = json.loads(json.dumps(SEED))
    bad2["sections"][2]["tabs"][1]["blocks"][0]["items"][0]["pct"] = 150
    rep, issues = load(bad2)
    assert rep is None and issues
