"""Deriva backend/app/templates/shell.html desde la plantilla visual (seed/Informe_TH.v9.html).

El shell conserva CSS y JS tal cual; solo cambia por marcadores @@NOMBRE@@ lo que depende de los datos
(textos de portada y encabezado, logos, enlace, pestañas y paneles). Si la plantilla visual cambia,
se vuelve a correr este script y se ajustan los literales que fallen.
"""
import re, sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
h = (root / "seed/Informe_TH.v9.html").read_text(encoding="utf-8")


def sub(old, new, n=1):
    global h
    c = h.count(old)
    assert c == n, f"{c} coincidencias (se esperaban {n}): {old[:80]!r}"
    h = h.replace(old, new)


LOGO_B = "https://media.presidencia.gov.co/Intranet/th/NOVIEMBRE2026/LOGO%20BLANCO.png"
LOGO_C = "https://media.presidencia.gov.co/Intranet/th/NOVIEMBRE2026/LOGO%20COLOR.png"
sub("<title>Informe – Oficina de Talento Humano</title>", "<title>@@TITLE_TAG@@</title>")
sub('<html lang="es" data-theme="light">', '<html lang="es" data-theme="@@THEME@@">')
sub('<div id="intro" data-bg="foto"', '<div id="intro" data-bg="@@COVER@@"')
sub(f'class="logo ilogo" src="{LOGO_B}"', 'class="logo ilogo" src="@@LOGO_DARK@@"')
sub('<p class="i-top">PRESIDENCIA DE LA REPÚBLICA</p>', '<p class="i-top">@@ORG_UP@@</p>')
sub('data-word="Presentación"', 'data-word="@@INTRO_WORD@@"')
sub('<h2 class="i-sub">Oficina de Talento Humano</h2>', '<h2 class="i-sub">@@SUBTITLE@@</h2>')
sub('<div class="i-boss"><span>Jefe de Oficina</span><b>William Andrés Molina Agudelo</b></div>', '<div class="i-boss"><span>@@BOSS_ROLE@@</span><b>@@BOSS@@</b></div>')
sub(f'data-dark="{LOGO_B}" data-light="{LOGO_C}" src="{LOGO_C}"', 'data-dark="@@LOGO_DARK@@" data-light="@@LOGO_LIGHT@@" src="@@LOGO_LIGHT@@"')
sub('<b>Informe · Oficina de Talento Humano</b><br><span id="printDate"></span> · Presidencia de la República', '<b>Informe · @@SUBTITLE@@</b><br><span id="printDate"></span> · @@ORG@@')
sub('<h1>Seguimiento Interno<br><span>Oficina de Talento Humano</span></h1>', '<h1>@@TITLE@@<br><span>@@SUBTITLE@@</span></h1>')
sub('<p class="hsub">Presidencia de la República · Reunión de seguimiento interno</p>', '<p class="hsub">@@TAGLINE@@</p>')
n = h.count("https://claude.ai/artifact/3GFU61QtVkG6EUTy4Nv5ph")
assert n >= 4, n
h = h.replace("https://claude.ai/artifact/3GFU61QtVkG6EUTy4Nv5ph", "@@SHARE_URL@@")
sub("url('https://commons.wikimedia.org/wiki/Special:FilePath/Costado2_Casa_de_Nari%C3%B1o.jpg?width=1600')", "url('@@PALACE_URL@@')")
sub("<small>OFICINA DE TALENTO HUMANO</small>\n    <h2>Reporte de gestión</h2>\n    <p>Elija un grupo para ver su información.</p>",
    "<small>@@HERO_KICKER@@</small>\n    <h2>@@HERO_TITLE@@</h2>\n    <p>@@HERO_TEXT@@</p>")
sub("<footer>www.presidencia.gov.co</footer>", "<footer>@@FOOTER@@</footer>")
sub('<h3 class="pt-title">Planta transitoria · Flujo de trabajo de la prórroga</h3>', '<h3 class="pt-title">@@PT_TITLE@@</h3>')
sub('margin-top:2px">Seguimiento de actividades</p>', 'margin-top:2px">@@PT_SUB@@</p>')
sub('<b id="c-ej">1</b>', '<b id="c-ej">@@C_EJ@@</b>')
sub('<b id="c-pr">6</b>', '<b id="c-pr">@@C_PR@@</b>')
sub('<b id="c-es">5</b>', '<b id="c-es">@@C_ES@@</b>')
sub('id="c-h">Suma de la columna HORA: 80,5 h (sin dato en los pasos 5 y 11)</span>', 'id="c-h">@@C_H@@</span>')

# pestañas
m = re.search(r'(<div class="tabs" id="tabs">\n)(.*?)(\n  </div>\n  <div class="prog">)', h, re.S)
assert m
h = h[:m.start(2)] + "@@TABS@@" + h[m.end(2):]
# paneles: de <!-- INICIO --> hasta el <footer>
i, j = h.index("<!-- INICIO -->"), h.index("<footer>")
h = h[:i] + "@@PANELS@@\n\n" + h[j:]
out = root / "backend/app/templates/shell.html"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(h, encoding="utf-8")
print("shell:", len(h), "bytes;", len(re.findall(r"@@[A-Z_]+@@", h)), "marcadores")
