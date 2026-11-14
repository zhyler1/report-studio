// Nombres en español para los campos, tipos de bloque y opciones del esquema.
export const FIELD: Record<string, string> = {
  align: 'Alineación', alt: 'Texto alternativo (accesibilidad)', ancheta: 'Filas de la ancheta', ancheta_media: 'Imagen de la ancheta', ancheta_title: 'Título de ancheta',
  animate: 'Animar el número', autoplay: 'Reproducir al abrir', avg: 'Promedio (%)', background: 'Fondo animado', bar_color: 'Color de la barra', bar_pct: 'Porcentaje de la barra',
  bind: 'Tomar de otro bloque', blocks: 'Contenido', bonus: 'Filas de bonificación', bonus_label: 'Rótulo de bonificación', bonus_total: 'Total de bonificación',
  boss: 'Nombre de quien firma', boss_role: 'Cargo de quien firma', budget: 'Presupuesto', button: 'Botón', button_label: 'Texto del botón', caption: 'Pie de foto',
  color: 'Color', columns: 'Columnas', cover: 'Portada', cutoff: 'Fecha de corte', date: 'Fecha', default: 'Tema inicial', default_month: 'Mes inicial',
  disabled: 'Desactivado', efr_measure: 'Medida de ejecución', end: 'Fin (segundos)', evidence: 'Evidencia', footer: 'Pie de página', format: 'Formato', frequency: 'Periodicidad',
  group: 'Grupo', header: 'Encabezado', heading: 'Encabezado', height: 'Alto (px, 0 = automático)', hero_kicker: 'Rótulo superior del inicio', hero_text: 'Texto del inicio',
  hero_title: 'Título del inicio', hidden: 'Ocultar', hours: 'Horas', home: 'Tarjeta en Inicio', icon: 'Ícono', id: 'Identificador interno', intro_word: 'Palabra animada de la portada',
  items: 'Elementos', key: 'Clave de la columna', kind: 'Tipo', label: 'Rótulo', labels: 'Etiquetas del eje', level: 'Nivel', link: 'Enlace', logo_dark: 'Logo (fondo oscuro)',
  logo_light: 'Logo (fondo claro)', logro: 'Logro destacado', long: 'Número largo (letra más pequeña)', loop: 'Repetir', measure: 'Medida', media: 'Imagen / video / audio',
  milestone: 'Hitos', milestone_date: 'Fecha del hito', min_width: 'Ancho mínimo (px)', modal_title: 'Título de la ventana', muted: 'Sin sonido', n: 'Número', name: 'Nombre',
  note: 'Nota', org: 'Entidad', other: 'Otros', owner: 'Responsable', palace_url: 'Foto del palacio (dirección)', pct: '% de cumplimiento', plants: 'Plantas', posesiones: 'Posesiones',
  posesiones_label: 'Rótulo de posesiones', poster: 'Imagen de portada del video', prefix: 'Prefijo', procesos: 'Procesos', procesos_label: 'Rótulo de procesos', progress: 'Avances',
  projection_from: 'Proyección desde el punto', provistos: 'Provistos', ratio: 'Proporción de columnas', rows: 'Filas', series: 'Series', share_url: 'Enlace del QR',
  show: 'Qué mostrar', show_alerts: 'Mostrar Alertas', side_card: 'Tarjeta lateral', slot: 'Nombre del archivo', source: 'Tomar datos de', src: 'Dirección del archivo',
  start: 'Inicio (segundos)', stats: 'Cifras', status: 'Estado', steps: 'Pasos', style: 'Estilo', subtitle: 'Subtítulo', suffix: 'Sufijo', summary: 'Resumen', table: 'Tabla',
  tabs: 'Pestañas internas', tag: 'Etiqueta', tag_tone: 'Color de la etiqueta', tagline: 'Línea bajo el título', teaser: 'Texto de la tarjeta', text: 'Texto', theme: 'Apariencia',
  thresholds: 'Umbrales del semáforo (verde, amarillo, naranja)', times: 'Tiempos', title: 'Título', tone: 'Tono', total: 'Total', total_label: 'Rótulo del total', unit: 'Unidad',
  url: 'Dirección', vacantes: 'Vacantes', vacations: 'Filas de vacaciones', vacations_value: 'Valor de vacaciones', value: 'Valor', values: 'Valores', velitas: 'Filas de velitas',
  velitas_media: 'Imagen de velitas', velitas_note: 'Nota de velitas', velitas_title: 'Título de velitas', watch: 'Aspectos a vigilar', zoom: 'Ampliar al hacer clic',
  provistos_: '', columns_: '',
}

export const BLOCK: Record<string, string> = {
  stat_grid: 'Cifras destacadas', row_list: 'Lista de acciones con evidencia', note_list: 'Lista de observaciones', card_list: 'Tarjeta con lista', ring_card: 'Anillo de porcentaje',
  status_list: 'Lista de estados', numbered_cards: 'Tarjetas numeradas', step_cards: 'Pasos con fecha', link_cards: 'Tarjetas con enlace', gallery: 'Galería de imágenes', table: 'Tabla',
  plants: 'Planta de personal', workflow: 'Flujo de trabajo', agreement: 'Acuerdo / avance', activities: 'Actividades', budget: 'Presupuesto', calendar: 'Calendario',
  proposals: 'Propuestas', chart: 'Gráfico', media: 'Imagen / video / audio', grid: 'Columnas',
}

export const OPT: Record<string, string> = {
  light: 'Claro', dark: 'Oscuro', foto: 'Con foto', clasica: 'Clásica', alto: 'Alto', medio: 'Medio', bajo: 'Bajo', none: 'Ninguno', people: 'Personas', stock: 'Bolsa (velas)',
  heart: 'Corazón', doc: 'Documento', radio: 'Ondas / radio', shield: 'Escudo', auto: 'Automático', blue: 'Azul', red: 'Rojo', green: 'Verde', orange: 'Naranja', yellow: 'Amarillo',
  purple: 'Morado', navy: 'Azul oscuro', left: 'Izquierda', right: 'Derecha', center: 'Centro', text: 'Texto', money: 'Dinero', pct: 'Porcentaje', pct_bar: 'Porcentaje con barra',
  pill: 'Etiqueta', number: 'Número', image: 'Imagen', video: 'Video', audio: 'Audio', checks: 'Con vistos', plain: 'Viñetas', warn: 'Advertencia', violet: 'Violeta',
  ejecutado: 'Ejecutado', proceso: 'En proceso', espera: 'En espera', vacations: 'Vacaciones', bonus: 'Bonificación', ancheta: 'Ancheta', velitas: 'Velitas',
  bar: 'Barras', line: 'Líneas', area: 'Área', pie: 'Torta', donut: 'Dona', radar: 'Radar', gauge: 'Medidor', stacked: 'Barras apiladas', candles: 'Velas (bolsa)',
}

export const LONG = new Set(['text', 'summary', 'teaser', 'note', 'hero_text', 'caption', 'velitas_note', 'logro', 'tagline', 'evidence', 'other', 'times'])
export const label = (k: string) => FIELD[k] || k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
