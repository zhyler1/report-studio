"""Catálogo de estilos predeterminados de casilla (única fuente: el esquema, el dibujo y el selector del editor salen de aquí).
fam: d = oscuro (texto claro), l = claro (tinte del color), w = cálido (texto oscuro)."""
from typing import Literal

LOOKS: list[tuple[str, str, str, str]] = [
    # (clave, nombre, grupo, familia)
    ("solido", "Sólido", "Colores intensos", "d"), ("degradado", "Degradado", "Colores intensos", "d"), ("verde", "Verde", "Colores intensos", "d"),
    ("alerta", "Alerta", "Colores intensos", "d"), ("oscuro", "Oscuro", "Colores intensos", "d"), ("oceano", "Océano", "Colores intensos", "d"),
    ("atardecer", "Atardecer", "Colores intensos", "d"), ("aurora", "Aurora", "Colores intensos", "d"), ("bosque", "Bosque", "Colores intensos", "d"),
    ("vino", "Vino", "Colores intensos", "d"), ("grafito", "Grafito", "Colores intensos", "d"), ("bronce", "Bronce", "Colores intensos", "d"),
    ("medianoche", "Medianoche", "Con efecto", "d"), ("neon", "Neón", "Con efecto", "d"), ("blueprint", "Plano", "Con efecto", "d"),
    ("acento", "Acento", "Cálidos", "w"), ("miel", "Miel", "Cálidos", "w"), ("arena", "Arena", "Cálidos", "w"), ("postit", "Nota adhesiva", "Cálidos", "w"),
    ("suave", "Suave", "Tintes suaves", "l"), ("dorado", "Dorado suave", "Tintes suaves", "l"), ("menta", "Menta", "Tintes suaves", "l"),
    ("rosado", "Rosado", "Tintes suaves", "l"), ("hielo", "Hielo", "Tintes suaves", "l"), ("burbuja", "Burbuja", "Tintes suaves", "l"),
    ("borde", "Borde", "Marcos y bandas", "l"), ("cinta", "Cinta", "Marcos y bandas", "l"), ("tapa", "Tapa", "Marcos y bandas", "l"),
    ("doble", "Doble borde", "Marcos y bandas", "l"), ("punteado", "Punteado", "Marcos y bandas", "l"), ("esquinas", "Esquinas", "Marcos y bandas", "l"),
    ("cabecera", "Cabecera", "Marcos y bandas", "l"), ("subrayado", "Subrayado", "Marcos y bandas", "l"), ("derecha", "Banda derecha", "Marcos y bandas", "l"),
    ("sello", "Sello", "Marcos y bandas", "l"), ("minimal", "Minimalista", "Marcos y bandas", "l"),
    ("cristal", "Cristal", "Con efecto", "l"), ("rayas", "Rayas", "Con textura", "l"), ("puntos", "Puntos", "Con textura", "l"),
    ("papel", "Papel", "Con textura", "l"), ("sombra", "Sombra", "Con efecto", "l"), ("glow", "Resplandor", "Con efecto", "l"),
]
FAM = {k: f for k, _, _, f in LOOKS}
LookKey = Literal[tuple([""] + [k for k, *_ in LOOKS])]  # type: ignore[valid-type]
