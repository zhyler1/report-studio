"""Puntos de partida para informes nuevos: sin textos ni datos de ningún área."""
from __future__ import annotations

STARTERS: list[dict] = [
    {
        "id": "personal",
        "name": "Presentación personal",
        "desc": "Portada genérica de la Presidencia, una sección en blanco y el estilo «Aire»",
        "data": {
            "schema_version": "1.0",
            "meta": {
                "title": "Título de la presentación", "subtitle": "Subtítulo o nombre del evento",
                "org": "Presidencia de la República", "boss_role": "", "boss": "",
                "tagline": "Presidencia de la República · Presentación",
                "hero_kicker": "PRESIDENCIA DE LA REPÚBLICA", "hero_title": "Contenido", "hero_text": "Elige una sección para verla.",
                "footer": "www.presidencia.gov.co", "share_url": "", "personal": True,
                "theme": {"look": "aire", "palette": "presidencia", "font": "sistema", "cover": "clasica", "default": "light", "layout": "clasico",
                          "intro_word": "Presentación",
                          "logo_dark": "https://media.presidencia.gov.co/Intranet/th/NOVIEMBRE2026/LOGO%20BLANCO.png",
                          "logo_light": "https://media.presidencia.gov.co/Intranet/th/NOVIEMBRE2026/LOGO%20COLOR.png"},
            },
            "sections": [{
                "id": "contenido", "label": "Contenido", "title": "Título de la sección", "subtitle": "", "icon": "none",
                "home": {"title": "Contenido", "text": "Resumen de esta sección.", "stats": []},
                "blocks": [
                    {"type": "callout", "heading": "Idea principal", "text": "Escribe aquí lo más importante que quieres que se lleve quien lo vea."},
                    {"type": "card_list", "title": "Puntos clave", "style": "checks", "items": ["Escribe aquí", "Escribe aquí", "Escribe aquí"]},
                ],
            }],
            "alerts": [],
        },
    },
]
