import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MetaForm, SectionForm, Defs, blank, BlockForm, blockTypes } from './SchemaForm'
import { attach, getAt, setAt, listOps, lockedAt, splitBlock, ungroup, groupNext, parentBlock } from './editLayer'
import { BLOCK, ICONOS } from './labels'
import Loader from './Loader'
import AiSettings from './AiSettings'
import Templates from './Templates'
import Ribbon, { type RibTab } from './Ribbon'
import { STARTERS } from './starters'
import { api, type Json, type ReportRow, type Version } from './api'

const LS = {
  get<T>(k: string, def: T): T { try { const v = localStorage.getItem('rs.' + k); return v === null ? def : JSON.parse(v) } catch { return def } },
  set(k: string, v: unknown) { try { localStorage.setItem('rs.' + k, JSON.stringify(v)) } catch { /* sin almacenamiento */ } },
  del(k: string) { try { localStorage.removeItem('rs.' + k) } catch { /* sin almacenamiento */ } },
}
type Prev = { tab: string; sub: (string | null)[]; y: number }
// al recargar la vista previa tras un cambio: sin portada ni animaciones de entrada (se quitan al asentarse)
const QUIET = '<style id="rs-quiet">#intro{display:none!important}*,*::before,*::after{animation-delay:0s!important;animation-duration:.001s!important;transition:none!important}</style>'
const restoreJs = (p: Prev) => `<script>addEventListener('load',function(){setTimeout(function(){var g=document.getElementById('iGo');if(g)g.click();var t=document.querySelector('.tab[data-t="${p.tab}"]');if(t)t.click();${JSON.stringify(p.sub)}.forEach(function(s){var b=document.querySelector('.sbtn[data-s="'+s+'"]');if(b)b.click()});setTimeout(function(){scrollTo(0,${p.y})},200);setTimeout(function(){var q=document.getElementById('rs-quiet');if(q)q.remove()},1100)},120)})</script>`
const readPrev = (doc?: Document | null): Prev | null => {
  const a = doc?.querySelector('.tab.active'); if (!doc || !a || doc.getElementById('intro')?.getBoundingClientRect().height) return null
  return { tab: a.getAttribute('data-t') || 'inicio', sub: Array.from(doc.querySelectorAll('.sbtn.on')).map(b => b.getAttribute('data-s')), y: doc.scrollingElement?.scrollTop || 0 }
}


function General({ d, set, frame }: { d: Json; set: (d: Json) => void; frame: { current: HTMLIFrameElement | null } }) {
  const hs: Json[] | null = d.meta.hero_stats ?? null
  const modo = hs !== null ? 'mano' : d.meta.hero_mode === 'grupos' ? 'grupos' : 'clasico'
  const cambiarModo = (v: string) => { const m = { ...d.meta }; delete m.hero_stats; delete m.hero_mode; if (v === 'grupos') m.hero_mode = 'grupos'; if (v === 'mano') m.hero_stats = deLaVista(); set({ ...d, meta: m }) }
  const setHs = (v: Json[] | null) => { const m = { ...d.meta }; if (v === null) delete m.hero_stats; else m.hero_stats = v; set({ ...d, meta: m }) }
  const deLaVista = (): Json[] => {   // lo que se ve hoy arriba del Inicio, como punto de partida para escribirlo a mano
    const els = Array.from(frame.current?.contentDocument?.querySelectorAll('#heroStats .hstat') || [])
    const r = els.map(e => ({ value: (e.querySelector('.num')?.getAttribute('data-to') || e.querySelector('.num')?.textContent || '').trim(), label: (e.querySelector('.lbl')?.textContent || '').trim(), prefix: '', suffix: '', animate: false, color: 'auto', long: false })).filter(x => x.label)
    return r.length ? r : [{ value: '', label: '', prefix: '', suffix: '', animate: false, color: 'auto', long: false }]
  }
  const upd = (i: number, k: string, v: string) => setHs((hs || []).map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  return <>
    <div className="card">
      <b>Cifras de arriba del Inicio (junto al QR)</b>
      <select style={{ margin: '8px 0' }} value={modo} onChange={e => cambiarModo(e.target.value)}>
        <option value="grupos">Automático: la cifra principal de cada grupo</option>
        <option value="clasico">Automático: planta, procesos, posesiones y presupuesto</option>
        <option value="mano">A mano</option></select>
      {modo === 'grupos' && <p className="mut" style={{ margin: '0 0 6px' }}>Toma la primera cifra de la tarjeta de cada grupo en Inicio (hasta 6). Se actualiza sola cuando cambian esas tarjetas, por ejemplo al cargar un documento.</p>}
      {hs && <>
        {hs.map((x, i) => <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input style={{ width: 110 }} placeholder="Cifra" value={x.value} onChange={e => upd(i, 'value', e.target.value)} />
          <input style={{ flex: 1 }} placeholder="Qué es (por ejemplo «Planta permanente»)" value={x.label} onChange={e => upd(i, 'label', e.target.value)} />
          <button className="danger" aria-label="Quitar cifra" onClick={() => setHs(hs.filter((_, j) => j !== i))}>✕</button></div>)}
        {hs.length < 6 && <button onClick={() => setHs([...hs, { value: '', label: '', prefix: '', suffix: '', animate: false, color: 'auto', long: false }])}>+ Agregar cifra</button>}</>}
    </div>
    <div className="card"><MetaForm meta={(({ hero_stats, hero_mode, home_hide, ...m }) => m)(d.meta)} set={m => set({ ...d, meta: { ...m, ...(d.meta.home_hide?.length ? { home_hide: d.meta.home_hide } : {}), ...(d.meta.hero_stats != null ? { hero_stats: d.meta.hero_stats } : {}), ...(d.meta.hero_mode ? { hero_mode: d.meta.hero_mode } : {}) } })} /></div></>
}

// Botones (pestañas internas) de una sección: agregar, renombrar, mover y quitar. Quitar un botón borra sus casillas.
function Botones({ s, set }: { s: Json; set: (s: Json) => void }) {
  const tabs: Json[] = s.tabs || []
  const [marc, setMarc] = useState<string[]>([])
  const slug = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'boton'
  const put = (t: Json[]) => set({ ...s, tabs: t })
  const add = () => {
    const label = (prompt('Nombre del botón nuevo (por ejemplo «Novenas»)') || '').trim(); if (!label) return
    let base = tabs.length || !s.blocks?.length ? tabs : [{ id: 'general', label: 'General', blocks: s.blocks }]
    let id = slug(label), n = 2; while (base.some(t => t.id === id)) id = slug(label) + '-' + n++
    set({ ...s, blocks: [], tabs: [...base, { id, label, blocks: [] }] })
  }
  const sinId = (o: Json): Json => Array.isArray(o) ? o.map(sinId) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).filter(([k]) => !(k === 'id' && 'type' in o)).map(([k, v]) => [k, sinId(v)])) : o
  const dup = (i: number) => {   // copia el botón con todas sus casillas, justo después y dentro de la misma sección
    const t = tabs[i]; const label = t.label + ' (copia)'
    let id = slug(label), n = 2; while (tabs.some(x => x.id === id)) id = slug(label) + '-' + n++
    const a = [...tabs]; a.splice(i + 1, 0, { ...sinId(JSON.parse(JSON.stringify(t))), id, label }); put(a)
  }
  const unir = () => {   // junta los botones marcados en uno solo: cada uno queda como un subtítulo con sus casillas debajo
    const ms = tabs.filter(t => marc.includes(t.id)); if (ms.length < 2) return
    const label = (prompt('Nombre del botón que reúne a «' + ms.map(t => t.label).join('», «') + '»') || '').trim(); if (!label) return
    let id = slug(label), n = 2; while (tabs.some(x => x.id === id && !marc.includes(x.id))) id = slug(label) + '-' + n++
    const blocks = ms.flatMap(t => [{ type: 'heading', title: t.label }, ...(t.blocks || [])])
    const first = tabs.findIndex(t => marc.includes(t.id))
    const rest = tabs.filter(t => !marc.includes(t.id)); rest.splice(first, 0, { id, label, blocks })
    put(rest); setMarc([])
  }
  const mv = (i: number, dx: number) => { const a = [...tabs], j = i + dx; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; put(a) }
  return <>
    <div className="rgl" style={{ margin: '12px 0 6px' }}>Botones de esta sección ({tabs.length})</div>
    {!tabs.length && <p className="mut" style={{ margin: '0 0 6px' }}>Esta sección no tiene botones: sus casillas van seguidas. Agrega un botón para separarlas por tema.</p>}
    {tabs.map((t, i) => <div key={t.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
      <input type="checkbox" title="Marcar para unir con otros botones" checked={marc.includes(t.id)} onChange={e => setMarc(e.target.checked ? [...marc, t.id] : marc.filter(x => x !== t.id))} />
      <input style={{ flex: 1 }} value={t.label} onChange={e => put(tabs.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
      <span className="mut">{t.blocks?.length || 0} casillas</span>
      <button title="Duplicar este botón con todas sus casillas" aria-label={'Duplicar ' + t.label} onClick={() => dup(i)}>⧉</button>
      <button onClick={() => mv(i, -1)} aria-label="Subir botón">↑</button><button onClick={() => mv(i, 1)} aria-label="Bajar botón">↓</button>
      <button className="danger" aria-label={'Quitar ' + t.label} onClick={() => confirm(`¿Quitar el botón «${t.label}» y sus ${t.blocks?.length || 0} casillas? Puedes deshacer con Ctrl+Z.`) && put(tabs.filter((_, k) => k !== i))}>✕</button></div>)}
    <button onClick={add} style={{ marginBottom: 10 }}>+ Agregar botón</button>
    <button disabled={marc.length < 2} onClick={unir} style={{ marginBottom: 10, marginLeft: 8 }} title="Marca dos o más botones con la casilla de la izquierda y únelos en uno solo">⇉ Unir marcados en un botón{marc.length > 1 ? ` (${marc.length})` : ''}</button>
    <button style={{ marginBottom: 10, marginLeft: 8 }} title="Reemplaza las cifras de la tarjeta de este grupo en Inicio por las de la casilla de cifras del botón «Resumen» o, si no hay, la última casilla de cifras de la sección" onClick={() => {
      const lists: Json[][] = [s.blocks || [], ...(s.tabs || []).map((t: Json) => t.blocks || [])]
      const conCifras = (l: Json[]) => l.filter((b: Json) => b.type === 'stat_grid' && b.items?.length)
      const rt = (s.tabs || []).find((t: Json) => /resumen/i.test(t.label || ''))
      const sg = (rt && conCifras(rt.blocks || [])[0]) || conCifras(lists.flat()).pop()
      if (!sg) { alert('Esta sección no tiene una casilla de cifras de donde tomar el resumen.'); return }
      if ((s.home?.stats || []).some((x: Json) => x.bind) && lists.flat().some((b: Json) => b.type === 'plants')) { alert('El resumen de este grupo se calcula solo de su casilla de planta; no hace falta actualizarlo.'); return }
      const stats = sg.items.slice(0, 3).map((x: Json) => ({ value: x.value, label: x.label, prefix: x.prefix || '', suffix: x.suffix || '', animate: typeof x.value === 'number', color: 'auto', long: String(x.value).length > 9 }))
      const h = s.home || { title: s.label, columns: 0, text: '', tag: '', tag_tone: 'red' }
      set({ ...s, home: { ...h, stats, columns: Math.min(stats.length, 3), text: '' } })
    }}>↻ Actualizar resumen de Inicio</button></>
}

function Secciones({ d, set, focus }: { d: Json; set: (d: Json) => void; focus: (id: string) => void }) {
  const secs: Json[] = d.sections
  const [open, setOpenS] = useState<number | null>(() => LS.get('sec', null))
  const setOpen = (v: number | null) => { setOpenS(v); LS.set('sec', v); if (v !== null && secs[v]) focus(secs[v].id) }
  const put = (i: number, s: Json) => set({ ...d, sections: secs.map((x, k) => (k === i ? s : x)) })
  const move = (i: number, dx: number) => {
    const a = [...secs]; const j = i + dx
    if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]; set({ ...d, sections: a })
  }
  const add = () => {
    const id = (prompt('Identificador corto de la sección (sin espacios ni tildes, por ejemplo "juridica")') || '').trim()
    if (!id) return
    const s = blank(Defs.current.Section); s.id = id; s.label = id; s.title = id
    set({ ...d, sections: [...secs, s] }); setOpen(secs.length)
  }
  return <>{secs.map((s, i) => <div className="card" key={i}>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <b style={{ flex: 1 }}>{s.label} <span className="mut">· {s.id}{s.hidden ? ' · oculta' : ''}</span></b>
      <button onClick={() => move(i, -1)} aria-label="Subir">↑</button><button onClick={() => move(i, 1)} aria-label="Bajar">↓</button>
      <button onClick={() => setOpen(open === i ? null : i)}>{open === i ? 'Cerrar' : 'Editar'}</button>
      <button className="danger" onClick={() => confirm(`¿Eliminar la sección «${s.label}» con todo su contenido?`) && set({ ...d, sections: secs.filter((_, k) => k !== i) })}>✕</button></div>
    {open === i && <>
      <div className="rgl" style={{ margin: '12px 0 6px' }}>Ícono animado del fondo de esta sección</div>
      <div className="icogrid">{ICONOS.map(([k, e, n]) => <button key={k} className={'icob' + ((s.icon || 'none') === k ? ' on' : '')} title={n} onClick={() => put(i, { ...s, icon: k })}><span>{e}</span><small>{n}</small></button>)}</div>
      <Botones s={s} set={v => put(i, v)} />
      <SectionForm section={s} set={v => put(i, v)} /></>}
  </div>)}<button className="pri" onClick={add}>+ Agregar sección</button></>
}

// Tarjetas de Inicio: mostrar/ocultar cada una y quitar cifras sueltas de una tarjeta
function InicioCards({ d, set, openDrawer }: { d: Json; set: (d: Json) => void; openDrawer: (k: string) => void }) {
  const secs: Json[] = d.sections
  const hide: string[] = d.meta.home_hide || []
  const putS = (i: number, s: Json) => set({ ...d, sections: secs.map((x, k) => (k === i ? s : x)) })
  const putHome = (i: number, h: Json) => putS(i, { ...secs[i], home: h })
  const setHide = (k: string, on: boolean) => set({ ...d, meta: { ...d.meta, home_hide: on ? Array.from(new Set([...hide, k])) : hide.filter(x => x !== k) } })
  return <>
    <p className="mut" style={{ marginTop: 0 }}>Quita lo que te sobre del botón Inicio. Ocultar una tarjeta no borra la sección: su botón sigue ahí.</p>
    {secs.filter(s => s.home).map(s => { const i = secs.indexOf(s); const h = s.home; const stats: Json[] = h.stats || []
      return <div className="card" key={s.id} style={h.hidden ? { opacity: .6 } : undefined}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!h.hidden} onChange={e => putHome(i, { ...h, hidden: !e.target.checked })} /><b style={{ flex: 1 }}>{h.title || s.label}</b></label>
        {stats.map((x, k) => <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
          <span style={{ flex: 1, fontSize: 13 }}><b>{(x.prefix || '') + String(x.value ?? '') + (x.suffix || '')}</b> <span className="mut">{x.label}</span></span>
          <button className="danger" title="Quitar esta cifra de la tarjeta" onClick={() => putHome(i, { ...h, stats: stats.filter((_, j) => j !== k), columns: Math.min(Math.max(stats.length - 1, 1), 3) })}>✕</button></div>)}
        {!stats.length && <p className="mut" style={{ margin: '6px 0 0', fontSize: 13 }}>Sin cifras{h.text ? ': muestra solo el texto.' : '.'}</p>}
      </div> })}
    <div className="card"><div className="rgl" style={{ margin: '0 0 6px' }}>Tarjetas fijas</div>
      <label style={{ display: 'flex', gap: 8, marginBottom: 6 }}><input type="checkbox" checked={!hide.includes('pt')} onChange={e => setHide('pt', !e.target.checked)} /> Planta transitoria</label>
      <label style={{ display: 'flex', gap: 8, marginBottom: 6 }}><input type="checkbox" checked={!hide.includes('pres')} onChange={e => setHide('pres', !e.target.checked)} /> Presupuesto (dona)</label>
      <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={!!d.meta.show_alerts} onChange={e => set({ ...d, meta: { ...d.meta, show_alerts: e.target.checked } })} /> Alertas de todos los grupos</label></div>
    <div className="card"><div className="rgl" style={{ margin: '0 0 6px' }}>Cifras grandes de arriba</div>
      <button onClick={() => openDrawer('general')}>Editar en General →</button></div>
  </>
}

function Textos({ d, set }: { d: Json; set: (d: Json) => void }) {
  const [cat, setCat] = useState<{ key: string; default: string; group: string }[]>([])
  useEffect(() => { api.texts().then(setCat) }, [])
  const tx: Record<string, string> = d.meta.texts || {}
  const put = (k: string, v: string) => { const n = { ...tx }; if (v) n[k] = v; else delete n[k]; set({ ...d, meta: { ...d.meta, texts: n } }) }
  const groups = Array.from(new Set(cat.map(c => c.group)))
  return <div className="card"><p className="mut" style={{ marginTop: 0 }}>Los rótulos que traen las casillas especiales (planta, presupuesto, acuerdo, actividades…). Escribe el que quieras; en blanco vuelve al original. También puedes darles doble clic en la vista previa.</p>
    {groups.map(g => <div key={g}><h4 style={{ margin: '14px 0 6px' }}>{g}</h4>{cat.filter(c => c.group === g).map(c => <div key={c.key} style={{ marginBottom: 6 }}>
      <input value={tx[c.key] ?? ''} placeholder={c.default} onChange={e => put(c.key, e.target.value)} /></div>)}</div>)}</div>
}

function Alertas({ d, set }: { d: Json; set: (d: Json) => void }) {
  const al: Json[] = d.alerts
  const groups = d.sections.map((s: Json) => s.id)
  const put = (i: number, a: Json) => set({ ...d, alerts: al.map((x, k) => (k === i ? a : x)) })
  return <div className="card"><table><thead><tr><th>Grupo</th><th>Nivel</th><th>Alerta</th><th></th></tr></thead><tbody>
    {al.map((a, i) => <tr key={i}>
      <td style={{ width: 120 }}><select value={a.group} onChange={e => put(i, { ...a, group: e.target.value })}>{groups.map((g: string) => <option key={g}>{g}</option>)}</select></td>
      <td style={{ width: 90 }}><select value={a.level} onChange={e => put(i, { ...a, level: e.target.value })}><option value="alto">Alto</option><option value="medio">Medio</option><option value="bajo">Bajo</option></select></td>
      <td><textarea value={a.text} onChange={e => put(i, { ...a, text: e.target.value })} /></td>
      <td><button className="danger" onClick={() => set({ ...d, alerts: al.filter((_, k) => k !== i) })}>✕</button></td></tr>)}
  </tbody></table>
    <button style={{ marginTop: 10 }} onClick={() => set({ ...d, alerts: [...al, { group: groups[0], level: 'medio', text: '' }] })}>+ Agregar alerta</button></div>
}

function JsonEditor({ d, set }: { d: Json; set: (d: Json) => void }) {
  const [txt, setTxt] = useState(() => JSON.stringify(d, null, 2))
  const [err, setErr] = useState('')
  const last = useRef(d)
  useEffect(() => { if (d !== last.current) { setTxt(JSON.stringify(d, null, 2)); last.current = d } }, [d])
  return <div className="card">{err && <div className="issues">{err}</div>}
    <textarea className="json" spellCheck={false} value={txt} onChange={e => {
      setTxt(e.target.value)
      try { const v = JSON.parse(e.target.value); setErr(''); last.current = v; set(v) } catch (x: any) { setErr('JSON inválido: ' + x.message) }
    }} /></div>
}

function Versiones({ id, onRestore, refreshKey }: { id: number; onRestore: () => void; refreshKey: number }) {
  const [vs, setVs] = useState<Version[]>([])
  useEffect(() => { api.versions(id).then(setVs) }, [id, refreshKey])
  return <div className="card">{vs.map(v => <div key={v.n} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
    <b>v{v.n}</b><span className="mut" style={{ flex: 1 }}>{new Date(v.created).toLocaleString('es-CO')} · {v.note || 'sin nota'}</span>
    {v.n !== vs[0]?.n && <button onClick={async () => { if (confirm(`¿Restaurar la versión ${v.n}? Se guarda como una versión nueva.`)) { await api.restore(id, v.n); onRestore() } }}>Restaurar</button>}</div>)}</div>
}

export default function App({ esAdmin = true }: { servidorPersonal?: boolean; esAdmin?: boolean }) {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [id, setId] = useState<number | null>(null)
  const [d, setDRaw] = useState<Json | null>(null)
  const [saved, setSaved] = useState('')
  const [rib, setRib] = useState<RibTab>('inicio')
  const [drawer, setDrawer] = useState<string | null>(() => LS.get<string | null>('drawer', null))
  const openDrawer = (k: string | null) => { setDrawer(k); LS.set('drawer', k) }
  const [issues, setIssues] = useState<string[]>([])
  const [html, setHtml] = useState('')
  const [msg, setMsg] = useState('')
  const [vk, setVk] = useState(0)
  const [ready, setReady] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const seen = useRef(false)
  const [sel, setSelS] = useState<string | null>(null)
  const [picker, setPicker] = useState<{ list: string; index: number; side?: boolean } | null>(null)
  const [toast, setToast] = useState('')
  const [loader, setLoader] = useState<number | null>(null)
  const dRef = useRef<Json | null>(null); dRef.current = d
  // historial para deshacer / rehacer (Ctrl/Cmd+Z, Mayús+Z o Ctrl+Y); los cambios seguidos en <0,7 s cuentan como uno
  const past = useRef<Json[]>([]), future = useRef<Json[]>([]), lastPush = useRef(0)
  const [hn, setHn] = useState({ u: 0, r: 0 })
  const sync = () => setHn({ u: past.current.length, r: future.current.length })
  const setD = (v: Json | null) => {
    const cur = dRef.current
    if (cur && v && v !== cur) {
      const now = Date.now()
      if (now - lastPush.current > 700 || !past.current.length) { past.current.push(cur); if (past.current.length > 100) past.current.shift() }
      lastPush.current = now; future.current = []; sync()
    }
    dRef.current = v; setDRaw(v)
  }
  const loadD = (v: Json | null) => { past.current = []; future.current = []; sync(); dRef.current = v; setDRaw(v) }
  const undo = () => { const u = past.current.pop(); if (!u) return; if (dRef.current) future.current.push(dRef.current); lastPush.current = 0; dRef.current = u; setDRaw(u); sync(); flash('Cambio deshecho') }
  const redo = () => { const u = future.current.pop(); if (!u) return; if (dRef.current) past.current.push(dRef.current); lastPush.current = 0; dRef.current = u; setDRaw(u); sync(); flash('Cambio rehecho') }
  const undoRef = useRef({ undo, redo }); undoRef.current = { undo, redo }
  const keyAct = useRef<(a: string) => void>(() => { })
  const onKey = useCallback((e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null
    if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return
    const k = e.key.toLowerCase()
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? undoRef.current.redo() : undoRef.current.undo() }
    else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); undoRef.current.redo() }
    else if (selRef.current && (e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); keyAct.current('dup') }
    else if (selRef.current && (k === 'delete' || k === 'backspace') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); keyAct.current('del!') }
    else if (selRef.current && e.altKey && (k === 'arrowup' || k === 'arrowdown')) { e.preventDefault(); keyAct.current(k === 'arrowup' ? 'up' : 'down') }
    else if (selRef.current && k === 'escape') { keyAct.current('desel') }
  }, [])
  useEffect(() => { window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [onKey])
  const selRef = useRef<string | null>(null); selRef.current = sel
  const select = useCallback((p: string | null) => { setSelS(p); setRib(r => (p ? 'casilla' : r === 'casilla' ? 'inicio' : r)); setTimeout(() => (frame.current?.contentDocument as any)?.__rsRedraw?.(), 60) }, [])
  const flash = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) }, [])
  const kinds = useMemo(() => { const k: any = Defs.current?.Chart?.properties?.kind; const r = k?.$ref ? Defs.current[k.$ref.split('/').pop()] : k; return (r?.enum || []) as string[] }, [id, ready])
  const goAfter = useRef<string | null>(null)
  const onLoad = () => {
    const doc = frame.current?.contentDocument; if (!doc) return
    doc.addEventListener('keydown', onKey)
    attach(doc, { get: () => dRef.current, put: v => setD(v), select, sel: () => selRef.current, add: (list, index = 0) => setPicker({ list, index }), kinds, toast: flash, upload: async f => (await api.upload(f)).url })
    const g = goAfter.current   // sección recién creada: ir a ella en cuanto la vista previa ya la tenga
    if (g) setTimeout(() => { if (doc.querySelector(`.tab[data-t="${g}"]`)) { goAfter.current = null; goPreview(g) } }, 500)
  }
  useEffect(() => { api.schema().then(s => { Defs.current = s.$defs; setReady(true) }) }, [])
  const dirty = useMemo(() => d !== null && JSON.stringify(d) !== saved, [d, saved])

  const refresh = useCallback(() => api.list().then(setRows), [])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { const i = setInterval(() => { const p = readPrev(frame.current?.contentDocument); if (p) LS.set('prev', p) }, 1000); return () => clearInterval(i) }, [])
  useEffect(() => {  // al recargar, volver al informe que se estaba editando (con su borrador si lo había)
    const rid = LS.get<number | null>('id', null)
    if (rid === null) return
    api.get(rid).then(r => {
      const draft = LS.get<Json | null>('draft.' + rid, null)
      setId(rid); setSaved(JSON.stringify(r.data))
      if (draft) { loadD(draft); setMsg('Borrador sin guardar recuperado') } else loadD(r.data)
    }).catch(() => LS.del('id'))
  }, [])
  useEffect(() => {  // guarda el borrador mientras haya cambios sin guardar
    if (id === null || d === null) return
    if (dirty) LS.set('draft.' + id, d); else LS.del('draft.' + id)
  }, [d, id, dirty])

  const open = useCallback(async (rid: number) => {
    if (dirty && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return
    const r = await api.get(rid); setId(rid); LS.set('id', rid); LS.del('prev'); seen.current = false; loadD(LS.get<Json | null>('draft.' + rid, null) ?? r.data); setSaved(JSON.stringify(r.data)); setMsg(''); setVk(k => k + 1)
  }, [dirty])

  useEffect(() => {  // vista previa en vivo con retraso
    if (!d) return
    const t = setTimeout(async () => {
      const v = await api.validate(d).catch((e: any) => { setIssues(['No se pudo validar el informe: ' + e.message + '. Revisa la terminal donde corre el servidor.']); return null })
      if (!v) return
      setIssues(v.issues)
      {
        let h = await api.render(d, true).catch((e: any) => { setIssues(['No se pudo generar la vista previa: ' + e.message + '. Revisa la terminal donde corre el servidor.']); return '' })
        const doc = frame.current?.contentDocument
        const prev = (seen.current ? readPrev(doc) : null) || LS.get<Prev | null>('prev', null)
        if (h && prev) h = h.replace('</head>', QUIET + '</head>').replace('</body>', restoreJs(prev) + '</body>')
        seen.current = true
        setHtml(h)
      }
    }, 700)
    return () => clearTimeout(t)
  }, [d])

  const doInsert = (list: string, index: number, type: string, side?: boolean) => {
    const dd = dRef.current; if (!dd) return
    const def = blockTypes().find(x => x.type === type)?.def; if (!def) return
    const b: Json = { ...blank(def), ...(STARTERS[type] || {}) }
    let nd = dd
    if (side) { b.span = '1/2'; const sp = selRef.current; if (sp && getAt(nd, sp)?.span === 'full') nd = setAt(nd, sp + '.span', '1/2') }
    setD(listOps.insert(nd, list, index, b)); select(list + '.' + index)
  }
  const insertBlock = (type: string) => { if (!picker) return; doInsert(picker.list, picker.index, type, picker.side); setPicker(null) }
  const where = (): { list: string; index: number; si: number } | null => {  // dónde cae una casilla nueva: debajo de la seleccionada o al final de la sección visible
    const dd = dRef.current; if (!dd) return null
    const sp = selRef.current
    if (sp) { const k = sp.split('.'); const i = Number(k.pop()); return { list: k.join('.'), index: i + 1, si: Number(k[1]) || 0 } }
    const doc = frame.current?.contentDocument; const pv = readPrev(doc)
    const si = dd.sections.findIndex((s: Json) => s.id === pv?.tab); if (si < 0) return null
    const s = dd.sections[si]
    let list = `sections.${si}.blocks`
    if (s.tabs?.length) { const sid = doc?.querySelector(`#sn-${s.id} .sbtn.on`)?.getAttribute('data-s'); const ti = Math.max(0, s.tabs.findIndex((x: Json) => x.id === sid)); list = `sections.${si}.tabs.${ti}.blocks` }
    return { list, index: (getAt(dd, list) || []).length, si }
  }
  const insert = (type: string, side?: boolean) => {
    const w = where()
    if (!w) { flash('Abre una sección en la vista previa (o selecciona una casilla) y vuelve a intentarlo'); return }
    if (type === '__doc') { setLoader(w.si); return }
    if (type === '__pick') { setPicker({ list: w.list, index: w.index, side }); return }
    doInsert(w.list, w.index, type, side)
  }
  const op = (a: string) => {
    const sp = selRef.current, dd = dRef.current; if (!sp || !dd) return
    const k = sp.split('.'); const i = Number(k.pop()); const list = k.join('.')
    if (a === 'desel') { select(null); return }
    if (a === 'lock') { const cur = !!getAt(dd, sp)?.locked; setD(setAt(dd, sp + '.locked', !cur)); flash(cur ? 'Casilla desbloqueada' : 'Casilla bloqueada 🔒'); return }
    if (lockedAt(dd, sp)) { flash('Casilla bloqueada 🔒: desbloquéala para cambiarla'); return }
    if (a === 'up' || a === 'down') { setD(listOps.move(dd, sp, a === 'up' ? -1 : 1)); select(list + '.' + Math.max(0, i + (a === 'up' ? -1 : 1))) }
    else if (a === 'dup') { setD(listOps.dup(dd, sp)); select(list + '.' + (i + 1)) }
    else if (a === 'del' && confirm('¿Quitar esta casilla?')) { setD(listOps.del(dd, sp)); select(null) }
    else if (a === 'parent') { const q = parentBlock(dd, sp); if (q) select(q) }
    else if (a === 'ungroup') { setD(ungroup(dd, sp)); select(null); flash('Grupo deshecho') }
    else if (a === 'groupnext') { setD(groupNext(dd, sp)); flash('Agrupada con la siguiente: se mueven juntas, o por partes') }
    else if (a === 'split') { setD(splitBlock(dd, sp)); flash('Separada en casillas: ahora cada parte se arrastra sola'); select(null) }
    else if (a === 'del!') { setD(listOps.del(dd, sp)); select(null); flash('Casilla quitada · Ctrl+Z para deshacer') }
  }
  keyAct.current = op
  const [tpl, setTpl] = useState<{ si: number } | null>(null)
  const openTpl = () => { const w = where(); setTpl({ si: w ? w.si : -1 }) }
  const newSection = (sec: Json, name: string) => {
    const dd = dRef.current; if (!dd) return
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'seccion'
    const ids: string[] = dd.sections.map((x: Json) => x.id); let nid = slug, n = 2; while (ids.includes(nid)) nid = slug + '-' + n++
    const label = sec.label || name
    const sg = (sec.blocks || []).find((b: Json) => b.type === 'stat_grid')   // tarjeta de Inicio: nombre, hasta 3 cifras de la primera casilla de cifras y el subtítulo
    const home = { title: label, columns: 0, text: sec.subtitle || '', tag: '', tag_tone: 'red',
      stats: ((sg?.items || []) as Json[]).slice(0, 3).map(i => ({ value: i.value, label: i.label, prefix: i.prefix || '', suffix: i.suffix || '', animate: true, color: 'auto', long: false })) }
    setD({ ...dd, sections: [...dd.sections, { ...sec, id: nid, label, home, hidden: false }] })
    flash('Sección «' + label + '» creada, con su tarjeta en Inicio · cambia el nombre en Datos › Secciones'); goAfter.current = nid
  }
  const addLoaded = (si: number, blocks: Json[], ti = 0, porTema = false, dudas: string[] = [], inicio: Json | null = null, reemplazar = false) => {
    if (dudas.length) setTimeout(() => alert('Quedó cargado. Revisa estos puntos que la IA no pudo resolver:\n\n' + dudas.map(x => '• ' + x.replace(/^Revisar:\s*/i, '')).join('\n')), 300)
    const dd = dRef.current; if (!dd) return
    const s = dd.sections[si]
    const keep = (b: Json) => ['activities', 'budget', 'calendar'].includes(b.type)   // «reemplazar» no borra los bloques de datos (actividades) ni los que dependen de ellos
    const conHome = (sec: Json): Json => {   // tarjeta-resumen de Inicio con las cifras nuevas (si las cifras actuales son calculadas de una casilla de planta y llega otra, se respetan)
      if (!inicio?.stats?.length) return sec
      const calc = (sec.home?.stats || []).some((x: Json) => x.bind) && blocks.some(b => b.type === 'plants')
      if (calc) return sec
      const stats = inicio.stats.slice(0, 4).map((x: Json) => ({ value: x.value, label: x.label, prefix: x.prefix || '', suffix: x.suffix || '', animate: typeof x.value === 'number', color: 'auto', long: String(x.value).length > 9 }))
      const h = sec.home || { title: sec.label, columns: 0, text: '', tag: '', tag_tone: 'red' }
      return { ...sec, home: { ...h, stats, columns: Math.min(stats.length, 3), tag: inicio.tag || h.tag, text: stats.length ? '' : h.text } }
    }
    if (porTema) {   // un botón (pestaña interna) por cada tema del documento; si ya existe una con ese nombre, se agrega ahí
      const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
      const slug = (x: string) => norm(x).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'tema'
      let tabs: Json[] = (s.tabs || []).map((t: Json) => ({ ...t, blocks: [...t.blocks] }))
      const limpios = new Set<string>()   // con «reemplazar», cada botón se vacía una sola vez antes de recibir lo nuevo
      if (!tabs.length && s.blocks?.length) tabs = [{ id: 'general', label: 'General', blocks: [...s.blocks] }]
      blocks.forEach(b => {
        const { _tema, ...blk } = b; const label = String(_tema || 'General')
        let t = tabs.find(x => norm(x.label) === norm(label))
        if (!t) { let id = slug(label), n = 2; while (tabs.some(x => x.id === id)) id = slug(label) + '-' + n++; t = { id, label, blocks: [] }; tabs.push(t) }
        if (reemplazar && !limpios.has(t.id)) { t.blocks = t.blocks.filter(keep); limpios.add(t.id) }
        t.blocks.push(blk)
      })
      setD({ ...dd, sections: dd.sections.map((x: Json, k: number) => k === si ? conHome({ ...x, tabs, blocks: [] }) : x) }); setLoader(null)
      goPreview(s.id); return
    }
    const list = s.tabs?.length ? `sections.${si}.tabs.${Math.min(ti, s.tabs.length - 1)}.blocks` : `sections.${si}.blocks`
    blocks = blocks.map(({ _tema, ...b }) => b)
    const base = reemplazar ? setAt(dd, list, (getAt(dd, list) || []).filter(keep)) : dd
    const at = (getAt(base, list) || []).length
    const nd = blocks.reduce((acc, b, k) => listOps.insert(acc, list, at + k, b), base)
    setD(inicio?.stats?.length ? { ...nd, sections: nd.sections.map((x: Json, k: number) => k === si ? conHome(x) : x) } : nd); setLoader(null)
    goPreview(s.id); select(list + '.' + at)
  }
  const openLoaded = async (data: Json) => {
    try { const r = await api.create(data, 'Importado desde HTML'); setLoader(null); await refresh(); open(r.id) } catch (e: any) { alert((e.issues?.length ? e.issues : [e.message]).join('\n')) }
  }
  const goPreview = (sid: string) => {  // llevar la vista previa a la sección que se edita
    const doc = frame.current?.contentDocument
    if (!doc) return
    const g = doc.getElementById('iGo') as HTMLElement | null
    if (g && doc.getElementById('intro')?.getBoundingClientRect().height) g.click()
    ;(doc.querySelector(`.tab[data-t="${sid}"]`) as HTMLElement | null)?.click()
  }
  const save = async () => {
    if (!d || id === null) return
    const note = prompt('¿Qué cambió? (opcional)') ?? ''
    try { const r = await api.save(id, d, note); setSaved(JSON.stringify(r.data)); setMsg('Guardado como versión ' + r.version); setVk(k => k + 1); refresh() }
    catch (e: any) { setIssues(e.issues?.length ? e.issues : [e.message]) }
  }
  const create = async () => {
    if (!d) { alert('Importa un JSON para crear el primer informe; luego podrás duplicarlo.'); return }
    const copy = JSON.parse(JSON.stringify(d))
    const r = await api.create(copy, 'Copia'); await refresh(); setId(r.id); LS.set('id', r.id); loadD(r.data); setSaved(JSON.stringify(r.data))
  }
  const newPersonal = async () => {
    try { const r = await api.fromStarter('personal'); await refresh(); setId(r.id); LS.set('id', r.id); loadD(r.data); setSaved(JSON.stringify(r.data)) } catch (x: any) { alert(x.message) }
  }
  const [ren, setRen] = useState<{ id: number; text: string } | null>(null)   // renombrar con doble clic en la barra lateral
  const renAt = useRef(0)
  const startRen = (r: { id: number; title: string }) => { renAt.current = Date.now(); setRen({ id: r.id, text: r.title }) }
  const commitRename = async () => {
    if (!ren) return
    const r = ren; setRen(null)
    const row = rows.find(x => x.id === r.id); const name = r.text.trim()
    if (!row || name === row.title) return
    try {
      await api.rename(r.id, name)
      if (r.id === id && d) {   // el informe abierto lleva el nombre nuevo sin marcar cambios pendientes que no existían
        const put = (j: Json) => { const m = { ...j, meta: { ...j.meta } }; if (name) m.meta.name = name; else delete m.meta.name; return m }
        setD(put(d)); try { setSaved(JSON.stringify(put(JSON.parse(saved)))) } catch { /* sin base guardada */ }
      }
      refresh()
    } catch (x: any) { alert(x.message || 'No se pudo renombrar') }
  }
  const removeRow = async (r: { id: number; title: string }) => {   // eliminar desde la barra lateral cualquier informe de la lista
    if (!confirm('¿Eliminar «' + r.title + '» y todas sus versiones? Esto no se puede deshacer.')) return
    try { await api.remove(r.id) } catch (x: any) { alert(x.message || 'No se pudo eliminar'); return }
    LS.del('draft.' + r.id)
    if (r.id === id) { LS.del('id'); LS.del('prev'); setId(null); loadD(null) }
    refresh()
  }
  const remove = async () => { if (id !== null) { const r = rows.find(x => x.id === id); await removeRow(r || { id, title: 'este informe' }) } }


  return <div className="app">
    <aside className="side"><h1>Report Studio</h1>
      <button className="pri" style={{ width: '100%', marginBottom: 8 }} title="Un informe en blanco con portada genérica, sin textos de ningún área" onClick={newPersonal}>＋ Nuevo informe</button>
      {d && <button style={{ width: '100%', marginBottom: 12 }} title="Copia el informe que tienes abierto" onClick={create}>Duplicar informe</button>}
      <label style={{ cursor: 'pointer' }} title="Abre un paquete .rsz (con sus imágenes) o un JSON suelto">Importar paquete o JSON<input type="file" accept=".rsz,.zip,application/json,.json" style={{ display: 'none' }} onChange={async e => {
        const f = e.target.files?.[0]; if (!f) return
        try { const r = await api.importFile(f); await refresh(); open(r.id) } catch (x: any) { alert((x.issues || [x.message]).join('\n')) }
        e.target.value = ''
      }} /></label>
      {rows.map(r => <div key={r.id} className={'item' + (r.id === id ? ' on' : '')} onClick={e => { if (e.detail < 2 && ren?.id !== r.id) open(r.id) }} onDoubleClick={() => startRen(r)} title="Doble clic para cambiar el nombre"><button className="itedit" title="Cambiar el nombre" aria-label={'Renombrar ' + r.title} onClick={e => { e.stopPropagation(); startRen(r) }}>✎</button><button className="itdel" title="Eliminar este informe" aria-label={'Eliminar ' + r.title} onClick={e => { e.stopPropagation(); removeRow(r) }}>✕</button>{ren?.id === r.id ? <input className="itren" autoFocus value={ren.text} onClick={e => e.stopPropagation()} onChange={e => setRen({ id: r.id, text: e.target.value })} onFocus={e => e.target.select()} onBlur={() => { if (Date.now() - renAt.current > 400) commitRename() }} onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRen(null) }} /> : r.title}<small>v{r.version} · {new Date(r.updated).toLocaleDateString('es-CO')}</small></div>)}
      {!rows.length && <p className="mut">Aún no hay informes. Importa el JSON del seed para empezar.</p>}
    </aside>
    {ready && d && id !== null ? <div className="main2">
      <Ribbon d={d} setD={setD} undo={undo} redo={redo} nu={hn.u} nr={hn.r} sel={sel} rib={rib} setRib={setRib} dirty={dirty} blocked={issues.length > 0} msg={msg} id={id} save={save} remove={remove}
        admin={esAdmin} openDrawer={openDrawer} insert={insert} openTpl={openTpl} op={op} kinds={kinds} />
      {issues.length > 0 && <div className="issues" style={{ margin: '6px 12px' }}><b>Avisos (para guardar hay que corregirlos):</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{issues.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      <div className="work">
        <div className="prev"><iframe ref={frame} onLoad={onLoad} title="Vista previa" srcDoc={html} sandbox="allow-scripts allow-same-origin allow-modals allow-popups" /></div>
        {drawer && <div className="drawer">
          <div className="dhead"><b style={{ flex: 1 }}>{({ casilla: 'Opciones de la casilla', general: 'General', textos: 'Textos fijos', secciones: 'Secciones', inicio: 'Tarjetas de Inicio', alertas: 'Alertas', json: 'JSON', ia: 'Motor de IA', versiones: 'Versiones' } as Record<string, string>)[drawer]}</b><button onClick={() => openDrawer(null)}>Cerrar ✕</button></div>
          {drawer === 'casilla' && (sel && getAt(d, sel) ? <div className="card"><p className="mut" style={{ marginTop: 0 }}>Doble clic sobre cualquier texto de la vista previa para editarlo ahí mismo.</p>
            <BlockForm block={getAt(d, sel)} set={v => setD(setAt(d, sel, v))} /></div> : <div className="card"><p className="mut">Haz clic en una casilla de la vista previa.</p></div>)}
          {drawer === 'general' && <General d={d} set={setD} frame={frame} />}
          {drawer === 'inicio' && <InicioCards d={d} set={setD} openDrawer={openDrawer} />}
          {drawer === 'secciones' && <Secciones d={d} set={setD} focus={goPreview} />}
          {drawer === 'textos' && <Textos d={d} set={setD} />}
          {drawer === 'alertas' && <Alertas d={d} set={setD} />}
          {drawer === 'json' && <JsonEditor d={d} set={setD} />}
          {drawer === 'ia' && esAdmin && <AiSettings />}
          {drawer === 'versiones' && <Versiones id={id} refreshKey={vk} onRestore={async () => { const r = await api.get(id); setD(r.data); setSaved(JSON.stringify(r.data)); setVk(k => k + 1); refresh() }} />}
        </div>}
      </div>
      {tpl && <Templates current={tpl.si >= 0 ? d.sections[tpl.si] : null} flash={flash} onClose={() => setTpl(null)}
        onAdd={blocks => { const si = tpl.si >= 0 ? tpl.si : 0; addLoaded(si, blocks) }} onNew={newSection} />}
      {picker && <div className="modal" onClick={() => setPicker(null)}><div className="modal-b" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>¿Qué quieres poner aquí?</h2>
        <div className="tiles">{([['chart', '📊', 'Gráfico'], ['media', '🎬', 'Video, audio o imagen'], ['stat_grid', '🔢', 'Cifras destacadas'], ['card_list', '📝', 'Texto con lista'], ['table', '▦', 'Tabla'], ['grid', '◫', 'Columnas (poner cosas lado a lado)'], ['__doc', '📥', 'Desde un documento o texto']] as const).map(([k, i, l]) =>
          <button key={k} className="tile" onClick={() => k === '__doc' ? (setLoader(Number(picker.list.split('.')[1]) || 0), setPicker(null)) : insertBlock(k)}><span style={{ fontSize: 30 }}>{i}</span>{l}</button>)}</div>
        <p className="mut" style={{ marginBottom: 4 }}>Otros tipos</p>
        <select defaultValue="" onChange={e => e.target.value && insertBlock(e.target.value)}><option value="">Elegir…</option>{blockTypes().map(x => <option key={x.type} value={x.type}>{BLOCK[x.type] || x.type}</option>)}</select>
        <div style={{ textAlign: 'right', marginTop: 12 }}><button onClick={() => setPicker(null)}>Cancelar</button></div></div></div>}
      {loader !== null && <Loader sections={d.sections} defSection={loader} onAdd={addLoaded} onOpenReport={openLoaded} onClose={() => setLoader(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div> : <div className="empty">Elige un informe de la izquierda o importa uno.</div>}
  </div>
}
