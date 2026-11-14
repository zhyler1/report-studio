"""Genera seed/charts_demo.json: el informe del seed + una sección «Galería de gráficos» con todos los tipos."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
rep = json.loads((root / "seed/report.seed.json").read_text(encoding="utf-8"))
M = ["Jun", "Jul", "Ago", "Sep", "Oct", "Nov"]
def ch(kind, title, **kw):
    return {"type": "chart", "kind": kind, "title": title, **kw}
def s(name, values, **kw):
    return {"name": name, "values": values, **kw}

blocks = [
    ch("bar", "Actos administrativos por mes", labels=M, series=[s("Prestaciones", [98, 110, 120, 105, 137, 150]), s("Otros", [20, 18, 25, 22, 22, 19])], caption="Barras agrupadas"),
    ch("hbar", "Avance por grupo (%)", labels=["Personal", "Nómina", "Bienestar", "Historias", "SST"], series=[s("Avance", [78, 92, 64, 71, 80])], unit="%"),
    ch("stacked", "Vinculaciones por tipo", labels=M, series=[s("Planta", [4, 6, 5, 8, 7, 9]), s("Temporal", [2, 1, 3, 2, 4, 3]), s("OPS", [10, 12, 9, 14, 11, 15])]),
    ch("stacked100", "Composición de la planta (%)", labels=["2023", "2024", "2025", "2026"], series=[s("Provistos", [780, 810, 850, 869]), s("Vacantes", [120, 100, 90, 121])]),
    ch("line", "Folios incorporados con proyección", labels=M, series=[s("Folios", [520, 610, 640, 700, 790, 868])], forecast=3, forecast_labels=["Dic", "Ene", "Feb"], caption="Línea con tendencia lineal y banda de confianza (proyección punteada)"),
    ch("area", "Ejecución acumulada (millones)", labels=M, series=[s("Ejecutado", [120, 260, 410, 540, 700, 844])], unit="M", forecast=2),
    ch("stacked_area", "Solicitudes atendidas", labels=M, series=[s("Certificaciones", [30, 40, 35, 50, 60, 55]), s("Constancias", [20, 25, 30, 28, 35, 40])]),
    ch("combo", "Ingresos (barras) y tiempo de respuesta (línea)", labels=M, series=[s("Ingresos", [12, 18, 15, 22, 19, 25]), s("Días de respuesta", [9, 8, 8, 6, 5, 4], kind="line")]),
    ch("lollipop", "Capacitaciones por mes", labels=M, series=[s("Capacitaciones", [3, 5, 4, 7, 6, 8])]),
    ch("pie", "Distribución de alertas", labels=["Alto", "Medio", "Bajo"], series=[s("Alertas", [7, 13, 3])]),
    ch("donut", "Presupuesto por línea", labels=["Bienestar", "Capacitación", "Salud", "Cultura"], series=[s("COP", [320, 210, 180, 134])], unit="M"),
    ch("radialbar", "Cumplimiento por proceso", labels=["Personal", "Nómina", "Historias", "SST"], series=[s("%", [78, 92, 71, 80])], max=100, unit="%"),
    ch("gauge", "Cumplimiento del plan anual", series=[s("SG-SST", [80])], unit="%", max=100),
    ch("bullet", "Avance frente a la meta", labels=["Folios", "Certificaciones", "Posesiones", "Capacitaciones"], series=[s("Actual", [868, 182, 60, 8])], target=[1000, 200, 60, 12]),
    ch("radar", "Madurez por grupo", labels=["Planeación", "Ejecución", "Seguimiento", "Riesgos", "Comunicación"], series=[s("Hoy", [70, 85, 60, 55, 75]), s("Meta", [90, 90, 85, 80, 85])]),
    ch("scatter", "Antigüedad vs. días de capacitación", series=[{"name": "Funcionarios", "points": [{"x": 1, "y": 4}, {"x": 3, "y": 6}, {"x": 5, "y": 5}, {"x": 8, "y": 9}, {"x": 12, "y": 8}, {"x": 15, "y": 12}]}]),
    ch("bubble", "Procesos: costo, duración y volumen", series=[{"name": "Procesos", "points": [{"x": 10, "y": 30, "r": 50, "label": "Nómina"}, {"x": 25, "y": 12, "r": 20, "label": "Posesiones"}, {"x": 40, "y": 45, "r": 80, "label": "Historias"}, {"x": 15, "y": 20, "r": 10, "label": "SST"}]}]),
    ch("waterfall", "Planta: de vacantes a provistos", labels=["Inicio", "Posesiones", "Retiros", "Traslados", "Final"], series=[s("Planta", [850, 60, -25, -16, 869])], totals=[0, 4]),
    ch("funnel", "Proceso de vinculación", labels=["Convocados", "Con requisitos", "Entrevistados", "Seleccionados", "Posesionados"], series=[s("Personas", [240, 120, 60, 24, 20])]),
    ch("candles", "Rango de ejecución semanal", labels=["S1", "S2", "S3", "S4", "S5", "S6"], series=[{"name": "Ejecución", "ohlc": [[10, 18, 8, 15], [15, 22, 14, 20], [20, 24, 15, 17], [17, 21, 16, 21], [21, 30, 20, 28], [28, 31, 22, 24]]}]),
    ch("heatmap", "Solicitudes por día y grupo", labels=["Lun", "Mar", "Mié", "Jue", "Vie"], series=[s("Personal", [12, 18, 9, 14, 7]), s("Nómina", [30, 25, 28, 40, 35]), s("Historias", [8, 10, 22, 12, 9]), s("SST", [3, 5, 4, 9, 2])]),
    ch("treemap", "Contratos por tipo", labels=["OPS", "Planta", "Temporal", "Prácticas", "Otros"], series=[s("Contratos", [140, 869, 60, 25, 12])]),
    ch("timeline", "Hitos del cierre de diciembre", events=[{"label": "Socialización sindicatos", "start": "2026-11-18", "text": "PIC y PDB"}, {"label": "Entrega de bonos", "start": "2026-11-25", "end": "2026-11-28"}, {"label": "Novena de aguinaldos", "start": "2026-12-09"}, {"label": "Vacaciones recreativas", "start": "2026-12-14", "end": "2026-12-18"}, {"label": "Cierre de vigencia", "start": "2026-12-30"}]),
    ch("gantt", "Cronograma de actividades", events=[{"label": "Preparar PIC", "start": "2026-10-20", "end": "2026-11-20", "done": 70}, {"label": "Socialización", "start": "2026-11-18", "end": "2026-11-30", "done": 30}, {"label": "Ejecución diciembre", "start": "2026-12-01", "end": "2026-12-22", "done": 0}, {"label": "Informe de cierre", "start": "2026-12-23", "end": "2026-12-31", "done": 0}]),
]
rows = [{"type": "grid", "ratio": [1, 1], "columns": [[blocks[i]], [blocks[i + 1]]]} for i in range(0, len(blocks) - 1, 2)]
if len(blocks) % 2:
    rows.append(blocks[-1])
rep["sections"].append({"id": "graficos", "label": "Gráficos", "title": "Galería de gráficos", "subtitle": "Todos los tipos disponibles, con datos de ejemplo", "icon": "stock", "blocks": rows})
(root / "seed/charts_demo.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
print("ok", len(blocks), "gráficos")
