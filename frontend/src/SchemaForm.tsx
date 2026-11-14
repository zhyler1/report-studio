import { useState } from 'react'
import { BLOCK, LONG, OPT, label } from './labels'
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
  const name = label(k)
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
export function ObjectField({ s, value, set, bare }: { s: S; value: any; set: (v: any) => void; bare?: boolean }) {
  const props = Object.entries<S>(s.properties || {}).filter(([k, p]) => k !== 'type' || norm(p).s.const === undefined)
  const sorted = [...props.filter(([k]) => !ORDER_LAST.has(k)), ...props.filter(([k]) => ORDER_LAST.has(k))]
  const body = sorted.map(([k, p]) => <Field key={k} k={k} schema={p} value={value[k]} parent={value} set={v => set({ ...value, [k]: v })} />)
  return bare ? <>{body}</> : <div className="obj">{body}</div>
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
  return <div>{value.map((b, i) => <Row key={i} head={<><b>{BLOCK[b.type] || b.type}</b> <span className="mut">{short(b)}{b.hidden ? ' · oculto' : ''}</span></>}
    onUp={() => set(mv(value, i, -1))} onDown={() => set(mv(value, i, 1))} onDel={() => confirm('¿Eliminar este bloque?') && set(value.filter((_, j) => j !== i))}
    onDup={() => set([...value.slice(0, i + 1), JSON.parse(JSON.stringify(b)), ...value.slice(i + 1)])}>
    {map[b.type] ? <ObjectField s={def(b.type)} value={b} set={v => set(value.map((y, j) => (j === i ? v : y)))} bare /> : <p className="mut">Tipo desconocido: {b.type}</p>}</Row>)}
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}><select value={pick} onChange={e => setPick(e.target.value)}>{Object.keys(map).map(t => <option key={t} value={t}>{BLOCK[t] || t}</option>)}</select>
      <button className="pri" onClick={() => set([...value, blank(def(pick))])}>+ Agregar bloque</button></div></div>
}

export function SectionForm({ section, set }: { section: any; set: (v: any) => void }) {
  return <ObjectField s={Defs.current.Section} value={section} set={set} bare />
}
export function MetaForm({ meta, set }: { meta: any; set: (v: any) => void }) {
  return <ObjectField s={Defs.current.Meta} value={meta} set={set} bare />
}
