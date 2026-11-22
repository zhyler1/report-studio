import { useState, type ReactNode } from 'react'
import { getAt, setAt, VIZ, canSplit, parentBlock } from './editLayer'
import type { Json } from './api'

export type RibTab = 'inicio' | 'insertar' | 'diseno' | 'casilla' | 'datos'
export const PALETAS: { k: string; n: string; c: [string, string, string] }[] = [
  { k: 'presidencia', n: 'Presidencia', c: ['#1F5FAF', '#FDC800', '#C62828'] },
  { k: 'oceano', n: 'Océano', c: ['#0E7490', '#38BDF8', '#E39A0B'] },
  { k: 'bosque', n: 'Bosque', c: ['#2F7D4F', '#A3E635', '#C98A0B'] },
  { k: 'vino', n: 'Vino', c: ['#9F1D3A', '#F4B860', '#D9822B'] },
  { k: 'grafito', n: 'Grafito', c: ['#475569', '#FBBF24', '#D97706'] },
  { k: 'atardecer', n: 'Atardecer', c: ['#7C3AED', '#FDBA74', '#EA580C'] },
]
const FUENTES: [string, string][] = [['public', 'Public Sans (original)'], ['sistema', 'Sistema'], ['georgia', 'Georgia (con serifa)'], ['verdana', 'Verdana'], ['trebuchet', 'Trebuchet'], ['mono', 'Monoespaciada']]
const ANCHOS: [string, string][] = [['full', 'Ancho completo'], ['1/2', 'Mitad (1/2)'], ['1/3', 'Un tercio (1/3)'], ['2/3', 'Dos tercios (2/3)'], ['1/4', 'Un cuarto (1/4)'], ['3/4', 'Tres cuartos (3/4)']]
const DISENOS: [string, string][] = [['clasico', 'Clásico: pestañas arriba (original)'], ['lateral', 'Menú lateral fijo'], ['editorial', 'Editorial: estilo revista'], ['tablero', 'Tablero denso'], ['continuo', 'Página continua con menú fijo']]
const ESTILOS: [string, string][] = [['institucional', 'Institucional (original)'], ['aire', 'Aire: blanco y líneas finas'], ['vidrio', 'Vidrio: cristal sobre luz'], ['audaz', 'Audaz: bordes gruesos y sombra dura'], ['suave', 'Suave: redondeado y pastel'], ['revista', 'Revista: papel y serifa']]
const PORTADAS: [string, string][] = [['foto', 'Palacio (predeterminada)'], ['clasica', 'Clásica: partículas'], ['aurora', 'Aurora'], ['ondas', 'Ondas'], ['malla', 'Malla 3D']]
// Tema predeterminado: el original de la plantilla. Los demás son combinaciones completas (paleta + fuente + portada + modo).
export const TEMA_BASE = { look: 'institucional', palette: 'presidencia', primary: '', accent: '', font: 'public', cover: 'foto', default: 'light', layout: 'clasico' }
export const TEMAS: { n: string; d: string; th: Json }[] = [
  { n: 'Predeterminado', d: 'Presidencia · claro · portada con foto', th: TEMA_BASE },
  { n: 'Océano nocturno', d: 'Menú lateral · azul petróleo · oscuro · aurora', th: { look: 'institucional', palette: 'oceano', primary: '', accent: '', font: 'sistema', cover: 'aurora', default: 'dark' , layout: 'lateral' } },
  { n: 'Bosque institucional', d: 'Estilo revista · verde · claro · ondas', th: { look: 'institucional', palette: 'bosque', primary: '', accent: '', font: 'georgia', cover: 'ondas', default: 'light' , layout: 'editorial' } },
  { n: 'Vino ejecutivo', d: 'Página continua · granate · oscuro · malla 3D', th: { look: 'institucional', palette: 'vino', primary: '', accent: '', font: 'trebuchet', cover: 'malla', default: 'dark' , layout: 'continuo' } },
  { n: 'Grafito sobrio', d: 'Tablero denso · gris · claro · partículas', th: { look: 'institucional', palette: 'grafito', primary: '', accent: '', font: 'verdana', cover: 'clasica', default: 'light' , layout: 'tablero' } },
  { n: 'Atardecer creativo', d: 'Violeta y naranja · claro · aurora', th: { look: 'institucional', palette: 'atardecer', primary: '', accent: '', font: 'public', cover: 'aurora', default: 'light' , layout: 'clasico' } },
]
export const TEMAS_PERSONALES: { n: string; d: string; th: Json }[] = [
  { n: 'Aire', d: 'Minimalista · blanco · grafito · líneas finas', th: { look: 'aire', palette: 'grafito', primary: '', accent: '', font: 'sistema', cover: 'clasica', default: 'light', layout: 'clasico' } },
  { n: 'Vidrio', d: 'Cristal sobre luz · azul petróleo · oscuro · aurora · menú lateral', th: { look: 'vidrio', palette: 'oceano', primary: '', accent: '', font: 'sistema', cover: 'aurora', default: 'dark', layout: 'lateral' } },
  { n: 'Audaz', d: 'Bordes gruesos · violeta y naranja · claro · malla 3D', th: { look: 'audaz', palette: 'atardecer', primary: '', accent: '', font: 'trebuchet', cover: 'malla', default: 'light', layout: 'clasico' } },
  { n: 'Suave', d: 'Redondeado y pastel · verde · claro · ondas', th: { look: 'suave', palette: 'bosque', primary: '', accent: '', font: 'public', cover: 'ondas', default: 'light', layout: 'clasico' } },
  { n: 'Revista', d: 'Papel y serifa · granate · claro · estilo editorial', th: { look: 'revista', palette: 'vino', primary: '', accent: '', font: 'georgia', cover: 'clasica', default: 'light', layout: 'editorial' } },
]
const TKEYS = ['look', 'palette', 'primary', 'accent', 'font', 'cover', 'default', 'layout']
const loadTemas = (): { n: string; th: Json }[] => { try { return JSON.parse(localStorage.getItem('rs.themes') || '[]') } catch { return [] } }

// íconos de trazo (24×24)
const P: Record<string, string> = {
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3', redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6', import: 'M12 3v12m0 0-4-4m4 4 4-4M5 21h14',
  html: 'M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14', pdf: 'M6 3h9l4 4v14H6zM14 3v5h5M9 14h6M9 17h4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', chart: 'M4 20V10m6 10V4m6 16v-7M3 20h18',
  film: 'M4 5h16v14H4zM4 9h16M4 15h16M8 5v14M16 5v14', table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14M15 5v14',
  hash: 'M5 9h14M5 15h14M10 4 8 20M16 4l-2 16', text: 'M5 6h14M12 6v13M9 19h6', columns: 'M3 5h18v14H3zM12 5v14',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5', left: 'M15 18l-6-6 6-6', right: 'M9 6l6 6-6 6', copy: 'M9 9h11v11H9zM5 15V4h11',
  sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6', plus: 'M12 5v14M5 12h14', side: 'M3 5h8v14H3zM13 5h8v14h-8z',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5', alert: 'M12 3 2 20h20zM12 10v4M12 17v.5', braces: 'M8 4C5 4 6 9 4 12c2 3 1 8 4 8M16 4c3 0 2 5 4 8-2 3-1 8-4 8',
  history: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4M12 8v5l3 2', info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8v.5',
  type: 'M4 7V5h16v2M12 5v14M9 19h6', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3', unlock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 7.5-1.5', save2: 'M12 4v10m0 0-4-4m4 4 4-4M5 20h14',
}
const Ic = ({ n }: { n: string }) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={P[n] || P.file} /></svg>

export type RibProps = {
  d: Json; setD: (d: Json) => void; sel: string | null; rib: RibTab; setRib: (t: RibTab) => void
  undo: () => void; redo: () => void; nu: number; nr: number
  dirty: boolean; blocked: boolean; msg: string; id: number
  save: () => void; remove: () => void; admin?: boolean; openDrawer: (t: string) => void
  insert: (type: string, side?: boolean) => void; openTpl: () => void; op: (a: string) => void; kinds: string[]
}

const Btn = ({ i, l, onClick, cls, title, disabled }: { i: string; l: string; onClick: () => void; cls?: string; title?: string; disabled?: boolean }) =>
  <button className={'rb ' + (cls || '')} onClick={onClick} title={title} disabled={disabled}><span className="ri"><Ic n={i} /></span><span>{l}</span></button>
const Grp = ({ t, children }: { t: string; children: ReactNode }) => <div className="rg"><div className="rgi">{children}</div><div className="rgt">{t}</div></div>

function Color({ label, value, onChange, fallback }: { label: string; value: string; onChange: (v: string) => void; fallback: string }) {
  return <label className="rcol"><span>{label}</span><span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
    <input type="color" value={value || fallback} onChange={e => onChange(e.target.value)} />
    {value && <button className="rx" title="Quitar color propio" onClick={() => onChange('')}>✕</button>}</span></label>
}

const INSERTAR: [string, string, string][] = [['chart', 'chart', 'Gráfico'], ['media', 'film', 'Video / imagen'], ['table', 'table', 'Tabla'], ['stat_grid', 'hash', 'Cifras'], ['card_list', 'text', 'Texto y listas'], ['grid', 'columns', 'Columnas']]
const TABS: [RibTab, string][] = [['inicio', 'Inicio'], ['insertar', 'Insertar'], ['diseno', 'Diseño'], ['casilla', 'Casilla'], ['datos', 'Datos']]

export default function Ribbon(p: RibProps) {
  const { d, setD, sel, rib, setRib } = p
  const th = d.meta.theme
  const setTh = (patch: Json) => setD(setAt(d, 'meta.theme', { ...th, ...patch }))
  const b = sel ? getAt(d, sel) : null
  const putB = (patch: Json) => sel && setD(setAt(d, sel, { ...b, ...patch }))
  const [temas, setTemas] = useState(loadTemas)
  const saveTemas = (l: { n: string; th: Json }[]) => { setTemas(l); try { localStorage.setItem('rs.themes', JSON.stringify(l)) } catch { /* sin almacenamiento */ } }
  const cur = Object.fromEntries(TKEYS.map(k => [k, th[k] ?? (TEMA_BASE as Json)[k]]))
  const same = (a: Json) => TKEYS.every(k => (a[k] ?? '') === (cur[k] ?? ''))
  const pal = PALETAS.find(x => x.k === th.palette) || PALETAS[0]
  const sw = (x: Json) => { const q = PALETAS.find(z => z.k === x.palette) || PALETAS[0]; return [x.primary || q.c[0], x.accent || q.c[1], q.c[2]] }
  const Th = ({ n, d: dd, t, on, del }: { n: string; d?: string; t: Json; on: boolean; del?: () => void }) =>
    <span className="thw"><button className={'thc' + (on ? ' on' : '')} title={dd || n} onClick={() => setTh(t)}>
      <span className="sws">{sw(t).map(c => <i key={c} style={{ background: c }} />)}</span><b>{n}</b></button>
      {del && <button className="rx thx" title="Borrar este tema" onClick={del}>✕</button>}</span>
  return <div className="ribbon">
    <div className="rtabs">{TABS.filter(([k]) => k !== 'casilla' || sel).map(([k, l]) => <button key={k} className={rib === k ? 'on' : ''} onClick={() => setRib(k)}>{l}</button>)}
      <span className="rstat">{p.dirty ? <><i className="dot" />Cambios sin guardar</> : p.msg}</span></div>
    <div className="rbody">
      {rib === 'inicio' && <>
        <Grp t="Historial"><Btn i="undo" l={'Deshacer' + (p.nu ? ` (${p.nu})` : '')} title="Ctrl/Cmd + Z" onClick={p.undo} disabled={!p.nu} /><Btn i="redo" l="Rehacer" title="Ctrl/Cmd + Mayús + Z" onClick={p.redo} disabled={!p.nr} /></Grp>
        <Grp t="Informe"><Btn i="save" l="Guardar" cls={p.dirty && !p.blocked ? 'pri' : ''} onClick={p.save} /><Btn i="import" l="Cargar documento" onClick={() => p.insert('__doc')} /></Grp>
        <Grp t="Exportar"><a href={`/api/reports/${p.id}/export.rsz`} title="Para seguir editando en otro computador: el informe y sus imágenes en un solo archivo"><Btn i="save" l="Paquete (.rsz)" onClick={() => { }} /></a><a href={`/api/reports/${p.id}/export.html`}><Btn i="html" l="Exportar HTML" onClick={() => { }} /></a><a href={`/api/reports/${p.id}/export.pdf`}><Btn i="pdf" l="Exportar PDF" onClick={() => { }} /></a><a href={`/api/reports/${p.id}/export.pptx`}><Btn i="pdf" l="Exportar PowerPoint" onClick={() => { }} /></a></Grp>
        <Grp t="Otros"><Btn i="trash" l="Eliminar informe" cls="danger" onClick={p.remove} /></Grp>
        <span className="rmut"><Ic n="info" /> Para dar color a un texto o cifra (como el «01»): selecciónalo arrastrando el mouse, sin doble clic. Doble clic es para escribir.</span>
      </>}
      {rib === 'insertar' && <>
        <Grp t="Casillas">{INSERTAR.map(([k, i, l]) => <Btn key={k} i={i} l={l} onClick={() => p.insert(k)} />)}</Grp>
        <Grp t="Desde archivo"><Btn i="import" l="Desde documento" onClick={() => p.insert('__doc')} /></Grp>
        <Grp t="Plantillas"><Btn i="layers" l="Plantillas de sección" title="Inserta un arreglo de casillas listo o guarda la sección actual como plantilla" onClick={p.openTpl} /></Grp>
        <span className="rmut"><Ic n="info" /> {sel ? 'Se agrega debajo de la casilla seleccionada.' : 'Se agrega al final de la sección que estás viendo.'}</span>
      </>}
      {rib === 'diseno' && <>
        <Grp t="Temas"><div className="thl">
          {TEMAS.map(x => <Th key={x.n} n={x.n} d={x.d} t={x.th} on={same(x.th)} />)}</div></Grp>
        <Grp t="Presentaciones personales"><div className="thl">
          {TEMAS_PERSONALES.map(x => <Th key={x.n} n={x.n} d={x.d} t={x.th} on={same(x.th)} />)}</div></Grp>
        <Grp t="Mis temas"><div className="thl">
          {temas.map((x, i) => <Th key={'u' + i} n={x.n} t={x.th} on={same(x.th)} del={() => saveTemas(temas.filter((_, j) => j !== i))} />)}
          <button className="thc add" title="Guarda paleta, colores, fuente y portada actuales como tema propio" onClick={() => { const n = window.prompt('Nombre del tema'); if (n && n.trim()) saveTemas([...temas.filter(x => x.n !== n.trim()), { n: n.trim(), th: cur }]) }}><Ic n="plus" /><b>Guardar tema</b></button></div></Grp>
        <Grp t="Diseño de la plantilla"><div className="fld"><label>Estilo</label><select value={th.look || 'institucional'} onChange={e => setTh({ look: e.target.value })}>{ESTILOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div><div className="fld"><label>Estructura</label><select value={th.layout || 'clasico'} onChange={e => setTh({ layout: e.target.value })}>{DISENOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div></Grp>
        <Grp t="Portada"><div className="fld"><label>Animación</label><select value={th.cover} onChange={e => setTh({ cover: e.target.value })}>{PORTADAS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div></Grp>
        <Grp t="Colores"><div className="pals">{PALETAS.map(x => <button key={x.k} className={'pal' + (th.palette === x.k && !th.primary && !th.accent ? ' on' : '')} title={x.n} onClick={() => setTh({ palette: x.k, primary: '', accent: '' })}>
          <span className="sws">{x.c.map(c => <i key={c} style={{ background: c }} />)}</span><small>{x.n}</small></button>)}</div>
          <Color label="Principal" value={th.primary} fallback={pal.c[0]} onChange={v => setTh({ primary: v })} /><Color label="Acento" value={th.accent} fallback={pal.c[1]} onChange={v => setTh({ accent: v })} /></Grp>
        <Grp t="Texto"><div className="fld"><label>Fuente</label><select value={th.font} onChange={e => setTh({ font: e.target.value })}>{FUENTES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="fld"><label>Al abrir</label><select value={th.default} onChange={e => setTh({ default: e.target.value })}><option value="light">Claro</option><option value="dark">Oscuro</option></select></div></Grp>
        <Grp t="Secciones"><Btn i="layers" l="Íconos de sección" title="Elige entre 20 íconos animados para cada sección" onClick={() => p.openDrawer('secciones')} /></Grp>
      </>}
      {rib === 'casilla' && b && b.locked && <>
        <Grp t="Bloqueo"><Btn i="unlock" l="Desbloquear" title="Quita el bloqueo para poder cambiarla" onClick={() => p.op('lock')} /></Grp>
        <span className="rmut"><Ic n="lock" /> Esta casilla está bloqueada: no se mueve, edita ni borra, y los líderes no pueden cambiarla.</span>
      </>}
      {rib === 'casilla' && b && !b.locked && <>
        <Grp t="Tamaño"><div className="fld"><label>Ancho</label><select value={b.span || 'full'} onChange={e => putB({ span: e.target.value })}>{ANCHOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <Btn i="side" l="Casilla al lado" title="Agrega otra casilla a la derecha de esta" onClick={() => p.insert('__pick', true)} /></Grp>
        <Grp t="Color de la casilla"><Color label="Fondo" value={b.bg} fallback="#ffffff" onChange={v => putB({ bg: v })} /><Color label="Texto" value={b.fg} fallback="#14243f" onChange={v => putB({ fg: v })} /></Grp>
        {b.type === 'chart' && <Grp t="Gráfico"><div className="fld"><label>Tipo</label><select value={b.kind} onChange={e => putB({ kind: e.target.value })}>{p.kinds.map(k => <option key={k} value={k}>{k}</option>)}</select></div></Grp>}
        {(b.type === 'ring_card' || b.type === 'agreement') && <Grp t="Visualización"><div className="fld"><label>Cómo se dibuja</label>
          <select value={b.viz || 'ring'} onChange={e => putB({ viz: e.target.value })}>{VIZ.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div></Grp>}
        {canSplit(b) && <Grp t="Partes"><Btn i="columns" l="Separar en casillas" title="Cada parte pasa a ser una casilla que se arrastra, intercambia y bloquea sola" onClick={() => p.op('split')} /></Grp>}
        <Grp t="Agrupar">{b.type === 'group' ? <Btn i="columns" l="Desagrupar" title="Suelta las casillas del grupo" onClick={() => p.op('ungroup')} /> : <Btn i="layers" l="Agrupar con la siguiente" title="Juntas se mueven como un bloque, y cada una se puede mover sola" onClick={() => p.op('groupnext')} />}{sel && parentBlock(d, sel) && <Btn i="left" l="Contenedor" title="Selecciona el bloque que contiene a esta casilla" onClick={() => p.op('parent')} />}</Grp>
        <Grp t="Organizar"><Btn i="left" l="Antes" title="Alt + ↑" onClick={() => p.op('up')} /><Btn i="right" l="Después" title="Alt + ↓" onClick={() => p.op('down')} /><Btn i="copy" l="Duplicar" title="Ctrl/Cmd + D" onClick={() => p.op('dup')} /></Grp>
        <Grp t="Más"><Btn i="sliders" l="Todas las opciones" onClick={() => p.openDrawer('casilla')} /><Btn i="lock" l="Bloquear" title="Nadie la mueve, edita ni borra por accidente" onClick={() => p.op('lock')} /><Btn i="trash" l="Quitar" cls="danger" title="Supr" onClick={() => p.op('del')} /></Grp>
      </>}
      {rib === 'datos' && <>
        <Grp t="Informe"><Btn i="info" l="General" onClick={() => p.openDrawer('general')} /><Btn i="layers" l="Secciones" onClick={() => p.openDrawer('secciones')} /><Btn i="type" l="Textos fijos" onClick={() => p.openDrawer('textos')} /></Grp>
        <Grp t="Contenido"><Btn i="alert" l="Alertas" onClick={() => p.openDrawer('alertas')} /></Grp>
        <Grp t="Avanzado"><Btn i="braces" l="JSON" onClick={() => p.openDrawer('json')} /><Btn i="history" l="Versiones" onClick={() => p.openDrawer('versiones')} />{p.admin && <Btn i="sliders" l="Motor de IA" title="Clave de la API de Claude para cargar documentos (solo administrador)" onClick={() => p.openDrawer('ia')} />}</Grp>
      </>}
    </div>
  </div>
}
