"""Esquema del informe (versión 1.0).

Un informe es: metadatos + secciones + alertas.
Cada sección es una lista de *bloques* (o pestañas con bloques). Cada bloque tiene un
`type` que dice qué es (cifras, tabla, línea de tiempo, gráfico, audio, video...).
Agregar un tipo nuevo = agregar una clase aquí y una función de dibujo en el renderizador;
el administrador lo ofrece solo a partir del JSON Schema exportado.

Texto enriquecido (`Rich`): texto plano con **negrilla**. Es lo único que se permite, para
que nunca llegue HTML arbitrario al informe.
"""
from __future__ import annotations

from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

SCHEMA_VERSION = "1.0"

Rich = str  # texto con **negrilla**
Viz = Literal["ring", "gauge", "radialbar", "donut", "bullet", "bar", "kpi"]   # cómo se dibuja un porcentaje principal
PlantViz = Literal["bars", "donut", "bar", "kpi"]                              # provistos vs vacantes de cada planta
BudgetViz = Literal["donut", "gauge", "radialbar", "bullet", "bar", "kpi"]     # proyección frente al presupuesto
Color = Literal["auto", "blue", "red", "green", "orange", "yellow", "purple", "navy"]
Level = Literal["alto", "medio", "bajo"]
Status = Literal["ejecutado", "proceso", "espera"]
Icon = Literal["none", "people", "stock", "heart", "doc", "radio", "shield",
               "briefcase", "calendar", "chart", "target", "graduation", "megaphone", "gear", "lock", "scale", "building", "trophy", "bell", "clock", "globe"]   # 20 iconos animados de sección


class Base(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ───────────────────────── piezas pequeñas ─────────────────────────
class Stat(Base):
    value: Union[str, int, float]
    label: str
    prefix: str = ""
    suffix: str = ""
    animate: bool = True          # cuenta hacia arriba
    color: Color = "auto"
    long: bool = False            # cifra larga (montos): letra un poco menor
    bind: Optional[str] = None    # dato calculado, p. ej. "plants.total"


class Button(Base):
    label: str
    url: str = ""
    disabled: bool = False        # p. ej. "Piloto con datos ficticios"
    note: str = ""                # aviso si falta el enlace


class Media(Base):
    kind: Literal["image", "video", "audio"] = "image"
    slot: str = ""                # nombre de archivo esperado (marcador punteado)
    src: str = ""
    poster: str = ""
    alt: str = ""
    caption: str = ""
    zoom: bool = True
    height: int = 0               # alto mínimo del marcador mientras no hay archivo
    autoplay: bool = False
    loop: bool = False
    muted: bool = True
    start: Optional[float] = None
    end: Optional[float] = None


class Column(Base):
    key: str
    label: str
    align: Literal["left", "right", "center"] = "left"
    format: Literal["text", "money", "pct", "pct_bar", "pill", "number"] = "text"


# ───────────────────────── bloques ─────────────────────────
Hex = Field("", pattern=r"^(#[0-9a-fA-F]{6})?$")


class Tint(Base):
    """Color de un texto o cifra completa dentro de una casilla (el texto se ubica por su contenido y el orden en que aparece)."""
    t: str
    k: int = 0
    c: str = Hex


class BlockBase(Base):
    id: Optional[str] = None
    title: Optional[str] = None
    hidden: bool = False
    locked: bool = False   # bloqueada: no se mueve, edita ni borra (los líderes no pueden cambiarla)
    span: Literal["full", "1/2", "1/3", "2/3", "1/4", "3/4"] = "full"   # ancho; las casillas consecutivas con ancho parcial quedan lado a lado
    bg: str = Hex          # color de fondo de la casilla (vacío = el del tema)
    fg: str = Hex          # color del texto de la casilla (vacío = el del tema)
    tints: list[Tint] = []  # colores puntuales de textos o cifras de la casilla


class StatGrid(BlockBase):
    type: Literal["stat_grid"] = "stat_grid"
    items: list[Stat]
    min_width: int = 220


class RowItem(Base):
    n: Union[int, str]
    title: str
    text: Rich
    evidence: str = ""
    bar_pct: Optional[float] = None
    bar_color: Color = "blue"


class RowList(BlockBase):
    type: Literal["row_list"] = "row_list"
    header: str = "ACCIONES DE GESTIÓN"
    columns: tuple[str, str] = ("Acción / información a reportar", "Evidencia / dónde verificar")
    items: list[RowItem]


class NoteList(BlockBase):
    type: Literal["note_list"] = "note_list"
    header: str = "OBSERVACIONES"
    items: list[Rich]


class CardList(BlockBase):
    type: Literal["card_list"] = "card_list"
    style: Literal["checks", "plain", "warn"] = "plain"
    items: list[Rich]


class RingCard(BlockBase):
    type: Literal["ring_card"] = "ring_card"
    value: float
    text: Rich
    color: Color = "auto"         # auto = semáforo por umbrales
    viz: Viz = "ring"             # anillo (original) u otro gráfico


class StatusItem(Base):
    value: Union[str, int]
    text: Rich
    color: Color = "blue"


class StatusList(BlockBase):
    type: Literal["status_list"] = "status_list"
    items: list[StatusItem]


class NumberedCard(Base):
    n: str = ""
    text: Rich
    tone: Literal["none", "violet"] = "none"


class NumberedCards(BlockBase):
    type: Literal["numbered_cards"] = "numbered_cards"
    items: list[NumberedCard]
    min_width: int = 280


class StepCard(Base):
    n: str
    tag: str
    date: str
    title: str
    text: Rich


class StepCards(BlockBase):
    type: Literal["step_cards"] = "step_cards"
    header: str = ""
    media: Optional[Media] = None
    items: list[StepCard]


class LinkCard(Base):
    n: str
    title: str
    text: str
    button: Button


class LinkCards(BlockBase):
    type: Literal["link_cards"] = "link_cards"
    items: list[LinkCard]


class Gallery(BlockBase):
    type: Literal["gallery"] = "gallery"
    items: list[Media]
    side_card: Optional["InfoCard"] = None


class InfoCard(Base):
    title: str
    items: list[Rich]


class Table(BlockBase):
    type: Literal["table"] = "table"
    columns: list[Column]
    rows: list[dict[str, Union[str, int, float, None]]]


class Plant(Base):
    label: str
    provistos: int
    vacantes: int


class Plants(BlockBase):
    type: Literal["plants"] = "plants"
    plants: list[Plant]
    procesos: int
    procesos_label: str
    posesiones: int
    posesiones_label: str
    logro: Rich
    viz: PlantViz = "bars"        # barra apilada (original) u otro gráfico por planta


class PlantCard(BlockBase):
    """Una sola planta como casilla suelta (sale de «Separar en casillas» del bloque de plantas)."""
    type: Literal["plant_card"] = "plant_card"
    label: str
    provistos: int
    vacantes: int
    viz: PlantViz = "bars"


class Callout(BlockBase):
    """Recuadro destacado (verde), p. ej. «Logro destacado»."""
    type: Literal["callout"] = "callout"
    heading: str = "Logro destacado:"
    text: Rich


class Heading(BlockBase):
    """Solo un título de sección (usa el campo Título)."""
    type: Literal["heading"] = "heading"


class WorkflowStep(Base):
    n: int
    title: str
    owner: str = ""
    status: Status
    times: str = ""
    hours: str = ""
    other: str = ""


class Workflow(BlockBase):
    type: Literal["workflow"] = "workflow"
    heading: str
    modal_title: str = ""
    subtitle: str = ""
    teaser: str = ""
    button_label: str = "Ver planta transitoria ↗"
    link: str = ""
    steps: list[WorkflowStep]


class AgreementItem(Base):
    text: Rich


class Agreement(BlockBase):
    type: Literal["agreement"] = "agreement"
    heading: str
    cutoff: str
    avg: float
    color: Color = "auto"
    viz: Viz = "ring"             # anillo (original) u otro gráfico
    summary: Rich
    milestone_date: str
    milestone: list[str]
    progress: list[str]
    watch: list[str]
    table: Optional[Table] = None


class Activity(Base):
    measure: str
    name: str
    frequency: str
    pct: float = Field(ge=0, le=100)
    date: str
    note: str = ""
    value: str = ""               # "$ 151.272.800"


class Activities(BlockBase):
    type: Literal["activities"] = "activities"
    items: list[Activity]
    budget: str = ""              # "$ 844.784.981"
    total: str = ""               # vacío = suma de actividades
    total_label: str = "Proyección PAA"
    efr_measure: str = "EFR"      # medida que se agrupa como "MEDIDAS EFR"; el resto es "ACUERDO SINDICAL"


class Budget(BlockBase):
    type: Literal["budget"] = "budget"
    source: str                   # id de un bloque activities
    viz: BudgetViz = "donut"      # dona (original) u otro gráfico del % frente al presupuesto


class CalendarBlock(BlockBase):
    type: Literal["calendar"] = "calendar"
    source: str                   # id de un bloque activities
    default_month: Optional[str] = None  # "2026-12"


class Proposals(BlockBase):
    """Cotizaciones de Bienestar (vacaciones, bonos, anchetas, velitas)."""
    type: Literal["proposals"] = "proposals"
    show: list[Literal["vacations", "bonus", "ancheta", "velitas"]] = ["ancheta", "velitas"]
    ancheta_title: str = "PROPUESTAS · Anchetas"
    velitas_title: str = "PROPUESTAS · Kit de velitas"
    vacations: list[list[str]] = []
    vacations_value: str = ""
    bonus: list[list[str]] = []
    bonus_label: str = "TOTAL"
    bonus_total: str = ""
    ancheta: list[list[str]] = []
    ancheta_media: Optional[Media] = None
    velitas: list[list[str]] = []
    velitas_media: Optional[Media] = None
    velitas_note: str = ""


ChartKind = Literal[
    "bar", "hbar", "stacked", "stacked100", "line", "area", "stacked_area", "combo", "lollipop",
    "pie", "donut", "radialbar", "gauge", "bullet", "radar", "scatter", "bubble", "waterfall", "funnel",
    "candles", "heatmap", "treemap", "timeline", "gantt",
    "hstacked", "step", "pareto", "histogram", "pyramid", "rose", "waffle", "pictogram", "slope", "dumbbell", "bump",
    "hemicycle", "kpi", "calendar", "sankey"]


class Point(Base):
    x: float
    y: float
    r: float = 0          # tamaño (solo burbujas)
    label: str = ""


class Series(Base):
    name: str
    values: list[float] = []
    color: Color = "auto"
    kind: Optional[Literal["bar", "line"]] = None   # solo en «combinado»
    points: list[Point] = []                         # dispersión y burbujas
    ohlc: list[list[float]] = []                     # velas: [apertura, máximo, mínimo, cierre] por etiqueta


class Event(Base):
    label: str
    start: str                  # AAAA-MM-DD
    end: str = ""               # vacío = hito de un solo día
    text: str = ""
    color: Color = "auto"
    done: Optional[float] = None   # avance 0-100 (cronograma)
    value: Optional[float] = None  # intensidad (calendario de actividad); vacío = 1


class Link(Base):
    source: str
    target: str
    value: float


class Chart(BlockBase):
    """Gráficos de todo tipo, dibujados en SVG dentro del informe."""
    type: Literal["chart"] = "chart"
    kind: ChartKind
    labels: list[str] = []
    series: list[Series] = []
    events: list[Event] = []                 # línea de tiempo, cronograma y calendario
    links: list[Link] = []                   # flujos (sankey)
    bins: int = 0                            # histograma: número de intervalos (0 = automático)
    unit: str = ""
    target: list[float] = []                 # metas (bullet) o meta única
    max: Optional[float] = None              # tope del medidor / anillos
    totals: list[int] = []                   # cascada: índices de etiquetas que son totales
    forecast: int = 0                        # periodos a proyectar con tendencia lineal
    forecast_labels: list[str] = []
    projection_from: Optional[int] = None    # desde este índice los datos son proyección (línea punteada)
    height: int = 320
    show_legend: bool = True
    show_values: bool = True
    lower_is_better: bool = False            # indicadores/pendiente/mancuernas: bajar es bueno (verde)
    caption: str = ""


class MediaBlock(BlockBase):
    """Imagen, video o audio incrustado (el archivo vive en el servidor de media)."""
    type: Literal["media"] = "media"
    media: Media


class Grid(BlockBase):
    """Reparte bloques en columnas."""
    type: Literal["grid"] = "grid"
    ratio: list[float] = [1, 1]
    columns: list[list["Block"]]


class Group(BlockBase):
    """Agrupa casillas: se puede mover entera o por partes, y se desagrupa cuando se quiera."""
    type: Literal["group"] = "group"
    blocks: list["Block"] = []


Block = Annotated[
    Union[
        StatGrid, RowList, NoteList, CardList, RingCard, StatusList, NumberedCards, StepCards,
        LinkCards, Gallery, Table, Plants, Workflow, Agreement, Activities, Budget,
        CalendarBlock, Proposals, Chart, MediaBlock, Grid, Group, PlantCard, Callout, Heading,
    ],
    Field(discriminator="type"),
]


# ───────────────────────── secciones e informe ─────────────────────────
class HomeCard(Base):
    title: str = ""
    columns: int = 0              # 0 = automático
    stats: list[Stat] = []
    text: str = ""
    tag: str = ""
    tag_tone: Literal["red", "green"] = "red"


class Tab(Base):
    id: str
    label: str
    blocks: list[Block]


class Section(Base):
    id: str
    label: str                    # texto de la pestaña
    title: str
    subtitle: str = ""
    icon: Icon = "none"
    background: Optional[str] = None   # animación de fondo; None = la del icono
    hidden: bool = False
    home: Optional[HomeCard] = None
    blocks: list[Block] = []
    tabs: list[Tab] = []


class Alert(Base):
    group: str
    level: Level
    text: str


class Theme(Base):
    default: Literal["light", "dark"] = "light"
    layout: Literal["clasico", "lateral", "editorial", "tablero", "continuo"] = "clasico"   # diseño completo: menú, disposición y densidad
    cover: Literal["foto", "clasica", "aurora", "ondas", "malla"] = "foto"   # animación de portada; "foto" = la original
    palace_url: str = ""
    logo_dark: str = ""
    logo_light: str = ""
    intro_word: str = "Presentación"
    palette: Literal["presidencia", "oceano", "bosque", "vino", "grafito", "atardecer"] = "presidencia"
    primary: str = Hex     # color principal propio (reemplaza al de la paleta)
    accent: str = Hex      # color de acento propio
    font: Literal["public", "sistema", "georgia", "verdana", "trebuchet", "mono"] = "public"


class Meta(Base):
    title: str
    subtitle: str
    org: str
    boss_role: str = "Jefe de Oficina"
    boss: str = ""
    tagline: str = ""
    hero_kicker: str = ""
    hero_title: str = ""
    hero_text: str = ""
    footer: str = ""
    share_url: str = ""
    theme: Theme = Theme()
    show_alerts: bool = False
    thresholds: tuple[int, int, int] = (90, 80, 50)   # verde, amarillo, naranja; menos = rojo
    texts: dict[str, str] = {}      # rótulos fijos de las casillas especiales que la persona cambió (clave → texto)


class Report(Base):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    meta: Meta
    sections: list[Section]
    alerts: list[Alert] = []


for _m in (Gallery, Grid, Group, Section, Tab, Report):
    _m.model_rebuild()


def json_schema() -> dict:
    return Report.model_json_schema()
