// Contenido de ejemplo para que una casilla nueva sea válida y se vea al instante.
export const STARTERS: Record<string, any> = {
  chart: { kind: 'bar', title: 'Nuevo gráfico', labels: ['A', 'B', 'C'], series: [{ name: 'Serie 1', values: [10, 20, 15], color: 'auto', points: [], ohlc: [] }] },
  media: { title: '', media: { kind: 'video', slot: 'video.mp4', src: '', poster: '', alt: '', caption: '', zoom: true, height: 220, autoplay: false, loop: false, muted: true } },
  stat_grid: { items: [{ label: 'Descripción de la cifra', value: 0 }] },
  card_list: { title: 'Título', items: ['Primer punto'] },
  table: { title: 'Nueva tabla', columns: [{ key: 'a', label: 'Columna A', format: 'text' }, { key: 'b', label: 'Columna B', format: 'text' }], rows: [{ a: 'Dato', b: 'Dato' }] },
  grid: { columns: [[], []] },
  text: { text: 'Escribe aquí tu texto.' },
  popup: { label: 'Ver detalle', teaser: 'Haz clic para abrir', icon: '▤', variant: 'tarjeta', size: 'mediana', blocks: [{ type: 'text', text: 'Escribe aquí el contenido de la ventana.' }] },
  agenda: { title: 'Calendario', text: '2026-12-07 | Día de las velitas | Encuentro en el patio | Cultura\n2026-12-12 | Novena de aguinaldos | Auditorio, 3:00 p. m. | Bienestar\n2026-12-18..2026-12-19 | Jornada de salud | Primer piso | Salud', vista: 'ambas' },
  link: { items: [{ label: 'Abrir enlace', url: '', text: '' }] },
}
