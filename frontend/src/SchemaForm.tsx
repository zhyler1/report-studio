import { createContext, useContext, useState } from 'react'
import { BLOCK, CHART_FIELDS, LONG, OPT, SERIES_FIELDS, label } from './labels'
import { api } from './api'

type S = any
export const Defs = { current: {} as Record<string, S> }

const deref = (s: S): S => { let x = s; while (x?.$ref) x = Defs.current[x.$ref.split('/').pop()!]; return x }
const isNull = (x: S) => x?.type === 'null'

/** Resuelve $ref y anyOf [X, null] -> {s: X, nullable: true}. */
function norm(s: S): { s: S; nullable: boolean } {
  s = deref(s)
  if (s?.anyOf) {
    const rest = s.anyOf.filter((x: S) => !isNull(x)), nullable = rest.length !== s.anyOf.length
    if (rest.length === 1) return { s: { ...deref(rest[0]), title: s.title, default: s.default }, nullable }
    return { s: { ...s, anyOf: rest }, nullable }
  }
  return { s, nullable: false }
}

/** Valor nuevo en blanco para un esquema (usa defaults y campos obligatorios). */
export function blank(raw: S): any {
  const { s } = norm(raw)
  if (!s) return ''
  if (s.default !== undefined && !(s.type === 'object' && s.properties)) return JSON.parse(JSON.stringify(s.default))
  if (s.const !== undefined) return s.const
  if (s.enum) return s.enum[0]
  if (s.anyOf) return blank(s.anyOf[0])
  switch (s.type) {
    case 'string': return ''
    case 'integer': case 'number': return 0
    case 'boolean': return false
    case 'array': return s.prefixItems ? s.prefixItems.map(blank) : []
    case 'object': {
      const o: any = {}
      for (const [k, p] of Object.entries<S>(s.properties || {})) {
        const n = norm(p)
        if (n.s?.const !== undefined) o[k] = n.s.const
        else if (p.default !== undefined) o[k] = JSON.parse(JSON.stringify(p.default))
        else if ((s.required || []).includes(k)) o[k] = blank(p)
      }
      return o
    }
  }
  return ''
}

const isDisc = (items: S) => !!(items?.discriminator || items?.oneOf)
const short = (v: any): string => {
  if (v == null || typeof v !== 'object') return ''
  for (const k of ['title', 'label', 'name', 'text', 'measure', 'header', 'heading', 'group', 'n']) {
    const x = v[k]; if (typeof x === 'string' && x) return x.slice(0, 60); if (typeof x === 'number') return String(x)
  }
  return ''
}

function Row({ children, onUp, onDown, onDel, onDup, head, defaultOpen = false }: { children: any; onUp?: () => void; onDown?: () => void; onDel: () => void; onDup?: () => void; head: any; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return <div className="sub-card">
    <div className="sub-head"><span onClick={() => setOpen(!open)} style={{ flex: 1, cursor: 'pointer' }}>{open ? '▾' : '▸'} {head}</span>
      {onUp && <button onClick={onUp} aria-label="Subir">↑</button>}{onDown && <button onClick={onDown} aria-label="Bajar">↓</button>}
      {onDup && <button onClick={onDup} aria-label="Duplicar">⧉</button>}<button className="danger" onClick={onDel} aria-label="Eliminar">✕</button></div>
    {open && <div className="sub-body">{children}</div>}</div>
}

function Text({ k, v, set, num }: { k: string; v: any; set: (v: any) => void; num?: boolean }) {
  const long = LONG.has(k) || (typeof v === 'string' && (v.length > 70 || v.includes('\n')))
  if (long) return <textarea value={v ?? ''} onChange={e => set(e.target.value)} />
  return <input value={v ?? ''} onChange={e => { const t = e.target.value; set(num && /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t) }} />
}

function Media({ v, set }: { v: any; set: (v: any) => void }) {
  const [busy, setBusy] = useState(false)
  return <div style={{ display: 'flex', gap: 6 }}><input value={v ?? ''} onChange={e => set(e.target.value)} placeholder="https://… o sube un archivo" />
    <label className="upl">{busy ? '…' : 'Subir'}<input type="file" hidden accept="image/*,video/*,audio/*" onChange={async e => {
      const f = e.target.files?.[0]; if (!f) return; setBusy(true)
      try { set((await api.upload(f)).url) } catch (x: any) { alert('No se pudo subir: ' + x.message) } finally { setBusy(false); e.target.value = '' }
    }} /></label></div>
}

export function Field({ k, schema, value, set, parent }: { k: string; schema: S; value: any; set: (v: any) => void; parent?: any }) {
  const { s, nullable } = norm(schema)
  if (s?.const !== undefined) return null
  const name = k === 'source' && parent && 'target' in parent ? 'Origen' : k === 'target' && parent && 'source' in parent && 'value' in parent ? 'Destino' : label(k)
  if (nullable) {
    const on = value !== null && value !== undefined
    return <div><label><input type="checkbox" style={{ width: 'auto' }} checked={on} onChange={e => set(e.target.checked ? blank(s) : null)} /> {name} <span className="mut">(opcional)</span></label>
      {on && <Inner k={k} s={s} value={value} set={set} parent={parent} />}</div>
  }
  const simple = s.type === 'boolean'
  if (simple) return <label style={{ display: 'flex', gap: 6, alignItems: 'center', textTransform: 'none' }}><input type="checkbox" style={{ width: 'auto' }} checked={!!value} onChange={e => set(e.target.checked)} /> {name}</label>
  return <div><label>{name}</label><Inner k={k} s={s} value={value} set={set} parent={parent} /></div>
}

function Inner({ k, s, value, set, parent }: { k: string; s: S; value: any; set: (v: any) => void; parent?: any }) {
  if (s.enum) return <select value={value ?? s.enum[0]} onChange={e => set(e.target.value)}>{s.enum.map((o: string) => <option key={o} value={o}>{OPT[o] || o}</option>)}</select>
  if (s.anyOf) return <Text k={k} v={value} set={set} num />
  if (s.type === 'string') return (k === 'src' || k === 'poster') ? <Media v={value} set={set} /> : <Text k={k} v={value} set={set} />
  if (s.type === 'integer' || s.type === 'number') return <input type="number" step={s.type === 'integer' ? 1 : 'any'} value={value ?? 0} onChange={e => set(e.target.value === '' ? 0 : Number(e.target.value))} />
  if (s.type === 'array') return <ArrayField k={k} s={s} value={value ?? []} set={set} parent={parent} />
  if (s.type === 'object') return <ObjectField s={s} value={value ?? {}} set={set} />
  return null
}

const ORDER_LAST = new Set(['id', 'hidden'])
const KindCtx = createContext('')

const num = (s: string) => { const n = parseFloat(s.replace(/[%$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isNaN(n) ? 0 : n }
const iso = (s: string) => { s = s.trim(); const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s }

/** Convierte celdas copiadas de Excel (separadas por tabulación) en datos del gráfico. */
function applyPaste(c: any, text: string): any {
  const rows = text.replace(/\r/g, '').split('\n').filter(r => r.trim()).map(r => r.split('\t'))
  if (rows.length < 2) throw new Error('Pega al menos la fila de títulos y una fila de datos.')
  const head = rows[0], body = rows.slice(1), k = c.kind
  if (k === 'sankey') return { ...c, links: body.map(r => ({ source: r[0] || '', target: r[1] || '', value: num(r[2] || '0') })) }
  if (k === 'calendar') return { ...c, events: body.map(r => ({ label: r[2] || r[0] || '', start: iso(r[0] || ''), end: '', text: '', color: 'auto', done: null, value: r[1] ? num(r[1]) : null })) }
  if (k === 'histogram') { const v = rows.map(r => num(r[0] || '')).filter((_, i) => i > 0 || !isNaN(parseFloat((rows[0][0] || '').replace(',', '.')))); return { ...c, series: [{ ...(c.series[0] || { name: 'Datos', color: 'auto', kind: null, points: [], ohlc: [] }), values: v }] } }
  if (k === 'timeline' || k === 'gantt') return { ...c, events: body.map(r => ({ label: r[0] || '', start: iso(r[1] || ''), end: iso(r[2] || ''), text: '', color: 'auto', done: r[3] ? num(r[3]) : null })) }
  if (k === 'scatter' || k === 'bubble') return { ...c, series: [{ ...(c.series[0] || { name: head[1] || 'Serie', color: 'auto', values: [], kind: null, ohlc: [] }), points: body.map(r => ({ x: num(r[0]), y: num(r[1]), r: num(r[2] || '0'), label: r[3] || '' })) }] }
  if (k === 'candles') return { ...c, labels: body.map(r => r[0]), series: [{ ...(c.series[0] || { name: 'Serie', color: 'auto', values: [], kind: null, points: [] }), ohlc: body.map(r => [num(r[1]), num(r[2]), num(r[3]), num(r[4])]) }] }
  const names = head.slice(1).filter(x => x.trim()), single = ['pie', 'donut', 'treemap', 'funnel', 'radialbar', 'gauge', 'bullet', 'waterfall'].includes(k)
  const series = (single ? names.slice(0, 1) : names).map((n, i) => ({ ...(c.series[i] || { color: 'auto', kind: null, points: [], ohlc: [] }), name: n, values: body.map(r => num(r[i + 1] || '0')) }))
  return { ...c, labels: k === 'gauge' ? c.labels : body.map(r => r[0]), series }
}

function ExcelPaste({ chart, set }: { chart: any; set: (v: any) => void }) {
  const [on, setOn] = useState(false), [txt, setTxt] = useState(''), [err, setErr] = useState('')
  const help: Record<string, string> = { sankey: 'Origen · Destino · Valor', calendar: 'Fecha · Valor (opcional) · Etiqueta', histogram: 'una sola columna con los datos', timeline: 'Etiqueta · Inicio · Fin (opcional)', gantt: 'Etiqueta · Inicio · Fin · Avance %', scatter: 'x · y · tamaño · nombre', bubble: 'x · y · tamaño · nombre', candles: 'Etiqueta · Apertura · Máximo · Mínimo · Cierre' }
  const cols = help[chart.kind] || 'Etiqueta · Serie 1 · Serie 2 … (la primera fila son los títulos)'
  return <div className="card" style={{ background: '#F0F6FF' }}>
    <button onClick={() => setOn(!on)}>📋 {on ? 'Cerrar' : 'Pegar datos desde Excel'}</button>
    {on && <><p className="mut">Copia las celdas en Excel o Google Sheets y pégalas aquí. Columnas: {cols}</p>
      <textarea value={txt} onChange={e => setTxt(e.target.value)} placeholder={'\tVentas\tMeta\nEnero\t10\t12\nFebrero\t14\t12'} style={{ minHeight: 110, fontFamily: 'ui-monospace,monospace', fontSize: 12 }} />
      {err && <div className="issues">{err}</div>}
      <button className="pri" onClick={() => { try { set(applyPaste(chart, txt)); setErr(''); setOn(false); setTxt('') } catch (e: any) { setErr(e.message) } }}>Reemplazar los datos del gráfico</button></>}
  </div>
}

export function ObjectField({ s, value, set, bare }: { s: S; value: any; set: (v: any) => void; bare?: boolean }) {
  const kind = useContext(KindCtx)
  const isChart = s.title === 'Chart', isSeries = s.title === 'Series'
  let props = Object.entries<S>(s.properties || {}).filter(([k, p]) => k !== 'type' || norm(p).s.const === undefined)
  if (isChart) { const keep = CHART_FIELDS[value.kind]; if (keep) props = props.filter(([k]) => keep.includes(k)).sort((a, b) => keep.indexOf(a[0]) - keep.indexOf(b[0])) }
  if (isSeries) { const keep = SERIES_FIELDS(kind); props = props.filter(([k]) => keep.includes(k)).sort((a, b) => keep.indexOf(a[0]) - keep.indexOf(b[0])) }
  const sorted = [...props.filter(([k]) => !ORDER_LAST.has(k)), ...props.filter(([k]) => ORDER_LAST.has(k))]
  const fields = sorted.map(([k, p]) => <Field key={k} k={k} schema={p} value={value[k]} parent={value} set={v => set({ ...value, [k]: v })} />)
  const body = isChart ? <KindCtx.Provider value={value.kind}>{fields.slice(0, 1)}<ExcelPaste chart={value} set={set} />{fields.slice(1)}</KindCtx.Provider> : <>{fields}</>
  return bare ? body : <div className="obj">{body}</div>
}

function mv<T>(a: T[], i: number, d: number): T[] { const b = [...a], j = i + d; if (j < 0 || j >= b.length) return b;[b[i], b[j]] = [b[j], b[i]]; return b }

function ArrayField({ k, s, value, set, parent }: { k: string; s: S; value: any[]; set: (v: any[]) => void; parent?: any }) {
  const add = (x: any) => set([...value, x])
  if (s.prefixItems) return <div style={{ display: 'flex', gap: 6 }}>{s.prefixItems.map((p: S, i: number) =>
    <div key={i} style={{ flex: 1 }}><Inner k={k} s={norm(p).s} value={value[i]} set={v => set(value.map((x, j) => (j === i ? v : x)))} /></div>)}</div>
  const it = norm(s.items).s
  if (isDisc(it)) return <BlockList s={it} value={value} set={set} />
  if (it.enum) return <div className="chips">{it.enum.map((o: string) => <label key={o} className="chip"><input type="checkbox" style={{ width: 'auto' }} checked={value.includes(o)} onChange={e => set(e.target.checked ? [...value, o] : value.filter(x => x !== o))} /> {OPT[o] || o}</label>)}</div>
  if (it.type === 'array' && isDisc(norm(it.items).s)) return <div>{value.map((col: any[], i: number) => <Row key={i} defaultOpen head={<b>Columna {i + 1}</b>}
    onUp={() => set(mv(value, i, -1))} onDown={() => set(mv(value, i, 1))} onDel={() => confirm('¿Eliminar esta columna y su contenido?') && set(value.filter((_, j) => j !== i))}>
    <BlockList s={norm(it.items).s} value={col} set={v => set(value.map((y, j) => (j === i ? v : y)))} /></Row>)}<button onClick={() => add([])}>+ Agregar columna</button></div>
  if (it.type === 'array') return <Grid2D value={value} set={set} />
  if (it.type === 'string' || it.type === 'number' || it.type === 'integer') return <div>
    {value.map((x, i) => <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
      <div style={{ flex: 1 }}><Inner k={k} s={it} value={x} set={v => set(value.map((y, j) => (j === i ? v : y)))} /></div>
      <button onClick={() => set(mv(value, i, -1))}>↑</button><button onClick={() => set(mv(value, i, 1))}>↓</button><button className="danger" onClick={() => set(value.filter((_, j) => j !== i))}>✕</button></div>)}
    <button onClick={() => add(blank(it))}>+ Agregar</button></div>
  if (it.type === 'object' && !it.properties && it.additionalProperties) return <TableRows value={value} set={set} cols={parent?.columns || []} />
  return <div>{value.map((x, i) => <Row key={i} head={<>{i + 1}. <b>{short(x)}</b></>} onUp={() => set(mv(value, i, -1))} onDown={() => set(mv(value, i, 1))}
    onDel={() => confirm('¿Eliminar este elemento?') && set(value.filter((_, j) => j !== i))} onDup={() => set([...value.slice(0, i + 1), JSON.parse(JSON.stringify(x)), ...value.slice(i + 1)])}>
    <ObjectField s={it} value={x} set={v => set(value.map((y, j) => (j === i ? v : y)))} bare /></Row>)}
    <button onClick={() => add(blank(it))}>+ Agregar</button></div>
}

function Grid2D({ value, set }: { value: string[][]; set: (v: string[][]) => void }) {
  const w = Math.max(1, ...value.map(r => r.length))
  return <div style={{ overflowX: 'auto' }}><table><tbody>{value.map((r, i) => <tr key={i}>
    {Array.from({ length: w }, (_, c) => <td key={c}><input value={r[c] ?? ''} onChange={e => { const n = value.map(x => [...x]); n[i][c] = e.target.value; set(n) }} /></td>)}
    <td style={{ whiteSpace: 'nowrap' }}><button onClick={() => set(mv(value, i, -1))}>↑</button><button onClick={() => set(mv(value, i, 1))}>↓</button><button className="danger" onClick={() => set(value.filter((_, j) => j !== i))}>✕</button></td></tr>)}</tbody></table>
    <button onClick={() => set([...value, Array.from({ length: w }, () => '')])}>+ Fila</button> <button onClick={() => set(value.map(r => [...r, '']))}>+ Columna</button>
    {w > 1 && <button onClick={() => set(value.map(r => r.slice(0, -1)))}>− Columna</button>}</div>
}

function TableRows({ value, set, cols }: { value: Record<string, any>[]; set: (v: any[]) => void; cols: any[] }) {
  return <div style={{ overflowX: 'auto' }}><table><thead><tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}<th /></tr></thead><tbody>
    {value.map((r, i) => <tr key={i}>{cols.map(c => <td key={c.key}><input value={r[c.key] ?? ''} onChange={e => { const t = e.target.value; set(value.map((x, j) => (j === i ? { ...x, [c.key]: c.format === 'pct_bar' || c.format === 'pct' ? (t === '' || isNaN(Number(t)) ? t : Number(t)) : t } : x))) }} /></td>)}
      <td style={{ whiteSpace: 'nowrap' }}><button onClick={() => set(mv(value, i, -1))}>↑</button><button onClick={() => set(mv(value, i, 1))}>↓</button><button className="danger" onClick={() => set(value.filter((_, j) => j !== i))}>✕</button></td></tr>)}</tbody></table>
    <button onClick={() => set([...value, Object.fromEntries(cols.map(c => [c.key, '']))])}>+ Fila</button>
    {!cols.length && <p className="mut">Primero define las columnas de la tabla.</p>}</div>
}

function BlockList({ s, value, set }: { s: S; value: any[]; set: (v: any[]) => void }) {
  const map: Record<string, string> = s.discriminator?.mapping || Object.fromEntries((s.oneOf || s.anyOf || []).map((x: S) => [deref(x).properties?.type?.const, x.$ref]))
  const [pick, setPick] = useState(Object.keys(map)[0])
  const def = (t: string) => Defs.current[map[t].split('/').pop()!]
  const [fresh, setFresh] = useState(-1)
  const addT = (t: string) => { setFresh(value.length); set([...value, blank(def(t))]) }
  return <div>{value.map((b, i) => <Row key={i + ':' + (i === fresh ? 'n' : '')} defaultOpen={i === fresh} head={<><b>{BLOCK[b.type] || b.type}</b> <span className="mut">{short(b)}{b.hidden ? ' · oculto' : ''}</span></>}
    onUp={() => set(mv(value, i, -1))} onDown={() => set(mv(value, i, 1))} onDel={() => confirm('¿Eliminar este bloque?') && set(value.filter((_, j) => j !== i))}
    onDup={() => set([...value.slice(0, i + 1), JSON.parse(JSON.stringify(b)), ...value.slice(i + 1)])}>
    {map[b.type] ? <ObjectField s={def(b.type)} value={b} set={v => set(value.map((y, j) => (j === i ? v : y)))} bare /> : <p className="mut">Tipo desconocido: {b.type}</p>}</Row>)}
    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
      {map.chart && <button className="pri" onClick={() => addT('chart')}>📊 Agregar gráfico</button>}
      {map.media && <button className="pri" onClick={() => addT('media')}>🎬 Agregar imagen / video / audio</button>}</div>
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}><select value={pick} onChange={e => setPick(e.target.value)}>{Object.keys(map).map(t => <option key={t} value={t}>{BLOCK[t] || t}</option>)}</select>
      <button onClick={() => addT(pick)}>+ Agregar otro bloque</button></div></div>
}

export function SectionForm({ section, set }: { section: any; set: (v: any) => void }) {
  return <ObjectField s={Defs.current.Section} value={section} set={set} bare />
}
export function MetaForm({ meta, set }: { meta: any; set: (v: any) => void }) {
  return <ObjectField s={Defs.current.Meta} value={meta} set={set} bare />
}

export function BlockForm({ block, set }: { block: any; set: (v: any) => void }) {
  const def = Object.values(Defs.current).find((x: any) => x?.properties?.type?.const === block.type) as S | undefined
  return def ? <ObjectField s={def} value={block} set={set} bare /> : <p className="mut">Tipo desconocido: {block.type}</p>
}
export function blockTypes(): { type: string; def: S }[] {
  return Object.values(Defs.current).filter((x: any) => x?.properties?.type?.const && x.properties.type.const !== 'media_dummy').map((x: any) => ({ type: x.properties.type.const, def: x }))
}
