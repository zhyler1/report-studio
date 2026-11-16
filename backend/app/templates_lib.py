"""Plantillas de sección: arreglos de casillas listos para reutilizar. Las incluidas siguen la guía de la reunión de seguimiento."""
from __future__ import annotations

SIN_DATO = "Escribe aquí"

BUILTIN: list[dict] = [
    {
        "id": "b:seguimiento", "cat": "Reunión de seguimiento",
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
        "id": "b:alertas", "cat": "Reunión de seguimiento",
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
        "id": "b:cifras", "cat": "Reunión de seguimiento",
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
    {
        "id": "b:p-campana", "cat": "Presentaciones personales",
        "name": "Campaña de comunicación interna",
        "desc": "Idea central, público, mensajes clave, piezas, canales, cronograma y medición",
        "section": {
            "label": "Campaña", "title": "Nombre de la campaña", "subtitle": "Comunicación interna · periodo", "icon": "none",
            "blocks": [
                {"type": "callout", "heading": "Idea central", "text": "Una frase que resuma lo que quieres que la gente piense, sienta o haga."},
                {"type": "stat_grid", "items": [{"value": 0, "label": "Funcionarios alcanzados"}, {"value": 0, "label": "Piezas"}, {"value": 0, "label": "Canales"}, {"value": 0, "suffix": " días", "label": "Duración"}]},
                {"type": "card_list", "title": "Público", "style": "plain", "span": "1/2", "items": ["A quién va dirigida " + SIN_DATO, "Qué necesita saber " + SIN_DATO]},
                {"type": "card_list", "title": "Mensajes clave", "style": "checks", "span": "1/2", "items": [SIN_DATO, SIN_DATO, SIN_DATO]},
                {"type": "gallery", "title": "Piezas de la campaña", "items": [
                    {"kind": "image", "slot": "pieza-1.jpg", "src": "", "alt": "Pieza 1", "caption": "Pieza 1", "height": 220},
                    {"kind": "image", "slot": "pieza-2.jpg", "src": "", "alt": "Pieza 2", "caption": "Pieza 2", "height": 220},
                    {"kind": "image", "slot": "pieza-3.jpg", "src": "", "alt": "Pieza 3", "caption": "Pieza 3", "height": 220}]},
                {"type": "table", "title": "Cronograma", "columns": [
                    {"key": "fecha", "label": "Fecha", "format": "text"}, {"key": "accion", "label": "Acción", "format": "text"},
                    {"key": "canal", "label": "Canal", "format": "text"}, {"key": "resp", "label": "Responsable", "format": "text"}],
                 "rows": [{"fecha": "dd/mm", "accion": "Lanzamiento", "canal": "Correo / Intranet", "resp": "Nombre"}]},
                {"type": "card_list", "title": "Cómo mediremos", "style": "checks", "items": ["Indicador 1 " + SIN_DATO, "Indicador 2 " + SIN_DATO]},
            ],
        },
    },
    {
        "id": "b:p-resultados", "cat": "Presentaciones personales",
        "name": "Resultados de gestión",
        "desc": "Cifras principales, gráfica de evolución, logros y próximos pasos (sin datos de personas)",
        "section": {
            "label": "Resultados", "title": "Resultados de gestión", "subtitle": "Periodo", "icon": "none",
            "blocks": [
                {"type": "stat_grid", "items": [{"value": 0, "label": "Indicador 1"}, {"value": 0, "label": "Indicador 2"}, {"value": 0, "label": "Indicador 3"}, {"value": 0, "suffix": "%", "label": "Cumplimiento"}]},
                {"type": "chart", "kind": "bar", "title": "Evolución", "span": "2/3", "labels": ["Mes 1", "Mes 2", "Mes 3", "Mes 4"],
                 "series": [{"name": "Serie", "values": [10, 20, 30, 40]}]},
                {"type": "card_list", "title": "Logros", "style": "checks", "span": "1/3", "items": [SIN_DATO, SIN_DATO, SIN_DATO]},
                {"type": "callout", "heading": "Lo más importante", "text": "El mensaje que quieres que se lleve quien lo vea."},
                {"type": "card_list", "title": "Próximos pasos", "style": "plain", "items": [SIN_DATO, SIN_DATO]},
            ],
        },
    },
    {
        "id": "b:p-charla", "cat": "Presentaciones personales",
        "name": "Charla o evento",
        "desc": "Qué es, por qué importa, agenda, puntos clave y cierre con llamado a la acción",
        "section": {
            "label": "Charla", "title": "Título de la charla", "subtitle": "Fecha · lugar · quién presenta", "icon": "none",
            "blocks": [
                {"type": "callout", "heading": "En una frase", "text": "De qué trata y por qué le importa a quien escucha."},
                {"type": "numbered_cards", "title": "Agenda", "items": [
                    {"n": "01", "text": "Apertura y contexto", "tone": "none"}, {"n": "02", "text": "Tema principal", "tone": "none"},
                    {"n": "03", "text": "Preguntas", "tone": "none"}, {"n": "04", "text": "Cierre y siguientes pasos", "tone": "none"}], "min_width": 220},
                {"type": "card_list", "title": "Puntos clave", "style": "checks", "span": "1/2", "items": [SIN_DATO, SIN_DATO, SIN_DATO]},
                {"type": "media", "span": "1/2", "media": {"kind": "image", "slot": "imagen-charla.jpg", "src": "", "alt": "Imagen de apoyo", "caption": "", "height": 240}},
                {"type": "callout", "heading": "Qué hacemos ahora", "text": "El llamado a la acción: una cosa concreta que la gente puede hacer mañana."},
            ],
        },
    },
    {
        "id": "b:p-galeria", "cat": "Presentaciones personales",
        "name": "Galería de un evento",
        "desc": "Resumen del evento, fotos y datos de la jornada",
        "section": {
            "label": "Evento", "title": "Nombre del evento", "subtitle": "Fecha · lugar", "icon": "none",
            "blocks": [
                {"type": "stat_grid", "items": [{"value": 0, "label": "Asistentes"}, {"value": 0, "label": "Actividades"}, {"value": 0, "suffix": " h", "label": "Duración"}]},
                {"type": "gallery", "title": "Fotos", "items": [
                    {"kind": "image", "slot": "foto-1.jpg", "src": "", "alt": "Foto 1", "caption": "", "height": 200},
                    {"kind": "image", "slot": "foto-2.jpg", "src": "", "alt": "Foto 2", "caption": "", "height": 200},
                    {"kind": "image", "slot": "foto-3.jpg", "src": "", "alt": "Foto 3", "caption": "", "height": 200},
                    {"kind": "image", "slot": "foto-4.jpg", "src": "", "alt": "Foto 4", "caption": "", "height": 200}]},
                {"type": "card_list", "title": "Así se vivió", "style": "plain", "items": [SIN_DATO, SIN_DATO]},
            ],
        },
    },
    {
        "id": "b:p-boletin", "cat": "Presentaciones personales",
        "name": "Pieza informativa (tipo Entérate)",
        "desc": "Titular, resumen, tres noticias breves y enlaces de interés",
        "section": {
            "label": "Boletín", "title": "Titular principal", "subtitle": "Edición · fecha", "icon": "none",
            "blocks": [
                {"type": "callout", "heading": "Lo esencial", "text": "El resumen en dos líneas."},
                {"type": "card_list", "title": "Noticia 1", "style": "plain", "span": "1/3", "items": [SIN_DATO]},
                {"type": "card_list", "title": "Noticia 2", "style": "plain", "span": "1/3", "items": [SIN_DATO]},
                {"type": "card_list", "title": "Noticia 3", "style": "plain", "span": "1/3", "items": [SIN_DATO]},
                {"type": "link_cards", "items": [
                    {"n": "01", "title": "Enlace de interés", "text": "Describe a dónde lleva.", "button": {"label": "Abrir ↗", "url": "", "disabled": True, "note": "Pega aquí el enlace"}}]},
            ],
        },
    },
]
