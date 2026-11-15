"""Plantillas de sección: arreglos de casillas listos para reutilizar. Las incluidas siguen la guía de la reunión de seguimiento."""
from __future__ import annotations

SIN_DATO = "Escribe aquí"

BUILTIN: list[dict] = [
    {
        "id": "b:seguimiento",
        "name": "Seguimiento completo (guía de la reunión)",
        "desc": "Estado general, alertas con avance y riesgo, alertas nuevas, requerimientos y compromisos",
        "section": {
            "label": "Nuevo grupo", "title": "Nuevo grupo de trabajo", "subtitle": "Seguimiento ejecutivo · periodo", "icon": "none",
            "blocks": [
                {"type": "stat_grid", "title": "Estado general del proceso", "items": [
                    {"value": 0, "label": "Indicador principal"}, {"value": 0, "label": "Segundo indicador"},
                    {"value": 0, "label": "Tercer indicador"}, {"value": 0, "suffix": "%", "label": "Avance general"}]},
                {"type": "card_list", "title": "Actividades ejecutadas (últimos 15 días)", "style": "checks", "span": "1/2", "items": [SIN_DATO]},
                {"type": "card_list", "title": "Logros y resultados", "style": "checks", "span": "1/2", "items": [SIN_DATO]},
                {"type": "table", "title": "Seguimiento a alertas y riesgos", "columns": [
                    {"key": "alerta", "label": "Alerta", "format": "text"}, {"key": "estado", "label": "Situación actual", "format": "text"},
                    {"key": "avance", "label": "Avance", "format": "pct_bar"}, {"key": "cierre", "label": "Cierre proyectado", "format": "text"},
                    {"key": "riesgo", "label": "Riesgo", "format": "pill"}],
                 "rows": [{"alerta": "Alerta 1", "estado": "Describe la situación", "avance": 50, "cierre": "dd/mm/aaaa", "riesgo": "Medio"}]},
                {"type": "card_list", "title": "Alertas nuevas o emergentes", "style": "warn", "span": "1/2", "items": [SIN_DATO]},
                {"type": "card_list", "title": "Requerimientos y decisiones", "style": "plain", "span": "1/2", "items": ["Personal: " + SIN_DATO, "Presupuesto: " + SIN_DATO, "Apoyo de la Jefatura: " + SIN_DATO]},
                {"type": "table", "title": "Compromisos próximos (15 a 30 días)", "columns": [
                    {"key": "actividad", "label": "Actividad", "format": "text"}, {"key": "resp", "label": "Responsable", "format": "text"},
                    {"key": "fecha", "label": "Fecha", "format": "text"}, {"key": "resultado", "label": "Resultado esperado", "format": "text"}],
                 "rows": [{"actividad": "Actividad 1", "resp": "Nombre", "fecha": "dd/mm/aaaa", "resultado": "Qué se espera lograr"}]},
            ],
        },
    },
    {
        "id": "b:alertas",
        "name": "Alertas y acciones",
        "desc": "Tabla de alertas con avance y riesgo, más lo que se ha hecho para gestionarlas",
        "section": {
            "label": "Alertas", "title": "Alertas del área", "subtitle": "", "icon": "none",
            "blocks": [
                {"type": "table", "title": "Seguimiento a alertas y riesgos", "columns": [
                    {"key": "alerta", "label": "Alerta", "format": "text"}, {"key": "avance", "label": "Avance", "format": "pct_bar"},
                    {"key": "cierre", "label": "Cierre proyectado", "format": "text"}, {"key": "riesgo", "label": "Riesgo", "format": "pill"}],
                 "rows": [{"alerta": "Alerta 1", "avance": 50, "cierre": "dd/mm/aaaa", "riesgo": "Medio"}]},
                {"type": "card_list", "title": "Acciones ejecutadas", "style": "checks", "items": [SIN_DATO]},
            ],
        },
    },
    {
        "id": "b:cifras",
        "name": "Cifras y compromisos",
        "desc": "Una fila de indicadores y la tabla de compromisos próximos",
        "section": {
            "label": "Resumen", "title": "Resumen de gestión", "subtitle": "", "icon": "none",
            "blocks": [
                {"type": "stat_grid", "items": [{"value": 0, "label": "Indicador 1"}, {"value": 0, "label": "Indicador 2"}, {"value": 0, "label": "Indicador 3"}]},
                {"type": "table", "title": "Compromisos próximos", "columns": [
                    {"key": "actividad", "label": "Actividad", "format": "text"}, {"key": "resp", "label": "Responsable", "format": "text"},
                    {"key": "fecha", "label": "Fecha", "format": "text"}],
                 "rows": [{"actividad": "Actividad 1", "resp": "Nombre", "fecha": "dd/mm/aaaa"}]},
            ],
        },
    },
]
