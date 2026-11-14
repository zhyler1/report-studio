import { getAt, setAt } from './editLayer'
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
const INSERTAR: [string, string, string][] = [['chart', '📊', 'Gráfico'], ['media', '🎬', 'Video / audio / imagen'], ['table', '▦', 'Tabla'], ['stat_grid', '🔢', 'Cifras'], ['card_list', '📝', 'Texto y listas'], ['grid', '◫', 'Columnas'], ['__doc', '📥', 'Desde documento']]

export type RibProps = {
  d: Json; setD: (d: Json) => void; sel: string | null; rib: RibTab; setRib: (t: RibTab) => void
  dirty: boolean; blocked: boolean; msg: string; id: number
  save: () => void; remove: () => void; openDrawer: (t: string) => void
  insert: (type: string, side?: boolean) => void; op: (a: string) => void; kinds: string[]
}

const Btn = ({ i, l, onClick, cls, title }: { i: string; l: string; onClick: () => void; cls?: string; title?: string }) =>
  <button className={'rb ' + (cls || '')} onClick={onClick} title={title}><span className="ri">{i}</span><span>{l}</span></button>

function Color({ label, value, onChange, fallback }: { label: string; value: string; onChange: (v: string) => void; fallback: string }) {
  return <label className="rcol"><span>{label}</span><span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
    <input type="color" value={value || fallback} onChange={e => onChange(e.target.value)} />
    {value && <button className="rx" title="Quitar color propio" onClick={() => onChange('')}>✕</button>}</span></label>
}

export default function Ribbon(p: RibProps) {
  const { d, setD, sel, rib, setRib } = p
  const th = d.meta.theme
  const setTh = (patch: Json) => setD(setAt(d, 'meta.theme', { ...th, ...patch }))
  const b = sel ? getAt(d, sel) : null
  const putB = (patch: Json) => sel && setD(setAt(d, sel, { ...b, ...patch }))
  const tabs: [RibTab, string][] = [['inicio', 'Inicio'], ['insertar', 'Insertar'], ['diseno', 'Diseño'], ...(sel ? [['casilla', 'Casilla'] as [RibTab, string]] : []), ['datos', 'Datos']]
  const pal = PALETAS.find(x => x.k === th.palette) || PALETAS[0]
  return <div className="ribbon">
    <div className="rtabs">{tabs.map(([k, l]) => <button key={k} className={rib === k ? 'on' : ''} onClick={() => setRib(k)}>{l}</button>)}
      <span className="mut" style={{ marginLeft: 'auto', alignSelf: 'center', paddingRight: 8 }}>{p.dirty ? 'Cambios sin guardar' : p.msg}</span></div>
    <div className="rbody">
      {rib === 'inicio' && <>
        <Btn i="💾" l="Guardar" cls={p.dirty && !p.blocked ? 'pri' : ''} onClick={p.save} />
        <Btn i="📥" l="Cargar documento" onClick={() => p.insert('__doc')} />
        <span className="rsep" />
        <a href={`/api/reports/${p.id}/export.html`}><Btn i="🌐" l="Exportar HTML" onClick={() => { }} /></a>
        <a href={`/api/reports/${p.id}/export.pdf`}><Btn i="📄" l="Exportar PDF" onClick={() => { }} /></a>
        <span className="rsep" />
        <Btn i="🗑" l="Eliminar informe" cls="danger" onClick={p.remove} />
      </>}
      {rib === 'insertar' && <>
        {INSERTAR.map(([k, i, l]) => <Btn key={k} i={i} l={l} onClick={() => p.insert(k)} />)}
        <span className="rmut">{sel ? 'Se agrega debajo de la casilla seleccionada.' : 'Se agrega al final de la sección que estás viendo.'}</span>
      </>}
      {rib === 'diseno' && <>
        <div className="rgrp"><div className="rgl">Paleta de colores</div><div style={{ display: 'flex', gap: 6 }}>
          {PALETAS.map(x => <button key={x.k} className={'pal' + (th.palette === x.k && !th.primary && !th.accent ? ' on' : '')} title={x.n} onClick={() => setTh({ palette: x.k, primary: '', accent: '' })}>
            <span style={{ display: 'flex' }}>{x.c.map(c => <i key={c} style={{ background: c }} />)}</span><small>{x.n}</small></button>)}</div></div>
        <span className="rsep" />
        <div className="rgrp"><div className="rgl">Colores propios</div><div style={{ display: 'flex', gap: 12 }}>
          <Color label="Principal" value={th.primary} fallback={pal.c[0]} onChange={v => setTh({ primary: v })} />
          <Color label="Acento" value={th.accent} fallback={pal.c[1]} onChange={v => setTh({ accent: v })} /></div></div>
        <span className="rsep" />
        <div className="rgrp"><div className="rgl">Fuente</div><select value={th.font} onChange={e => setTh({ font: e.target.value })}>{FUENTES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="rgrp"><div className="rgl">Tema al abrir</div><select value={th.default} onChange={e => setTh({ default: e.target.value })}><option value="light">Claro</option><option value="dark">Oscuro</option></select></div>
      </>}
      {rib === 'casilla' && b && <>
        <div className="rgrp"><div className="rgl">Ancho</div><select value={b.span || 'full'} onChange={e => putB({ span: e.target.value })}>{ANCHOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <Btn i="◧" l="Casilla al lado" title="Agrega otra casilla a la derecha de esta" onClick={() => p.insert('__pick', true)} />
        <span className="rsep" />
        <div className="rgrp"><div className="rgl">Color de la casilla</div><div style={{ display: 'flex', gap: 12 }}>
          <Color label="Fondo" value={b.bg} fallback="#ffffff" onChange={v => putB({ bg: v })} />
          <Color label="Texto" value={b.fg} fallback="#14243f" onChange={v => putB({ fg: v })} /></div></div>
        {b.type === 'chart' && <><span className="rsep" /><div className="rgrp"><div className="rgl">Tipo de gráfico</div>
          <select value={b.kind} onChange={e => putB({ kind: e.target.value })}>{p.kinds.map(k => <option key={k} value={k}>{k}</option>)}</select></div></>}
        <span className="rsep" />
        <Btn i="◀" l="Antes" onClick={() => p.op('up')} /><Btn i="▶" l="Después" onClick={() => p.op('down')} />
        <Btn i="⧉" l="Duplicar" onClick={() => p.op('dup')} /><Btn i="⚙" l="Todas las opciones" onClick={() => p.openDrawer('casilla')} />
        <Btn i="🗑" l="Quitar" cls="danger" onClick={() => p.op('del')} />
      </>}
      {rib === 'datos' && <>
        <Btn i="🧾" l="General" onClick={() => p.openDrawer('general')} /><Btn i="🗂" l="Secciones" onClick={() => p.openDrawer('secciones')} />
        <Btn i="⚠" l="Alertas" onClick={() => p.openDrawer('alertas')} /><Btn i="{ }" l="JSON" onClick={() => p.openDrawer('json')} /><Btn i="🕘" l="Versiones" onClick={() => p.openDrawer('versiones')} />
      </>}
    </div>
  </div>
}
