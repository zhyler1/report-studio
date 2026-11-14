import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MetaForm, SectionForm, Defs, blank } from './SchemaForm'
import { api, type Json, type ReportRow, type Version } from './api'

const LS = {
  get<T>(k: string, def: T): T { try { const v = localStorage.getItem('rs.' + k); return v === null ? def : JSON.parse(v) } catch { return def } },
  set(k: string, v: unknown) { try { localStorage.setItem('rs.' + k, JSON.stringify(v)) } catch { /* sin almacenamiento */ } },
  del(k: string) { try { localStorage.removeItem('rs.' + k) } catch { /* sin almacenamiento */ } },
}
type Prev = { tab: string; sub: (string | null)[]; y: number }
const restoreJs = (p: Prev) => `<script>addEventListener('load',function(){setTimeout(function(){var g=document.getElementById('iGo');if(g)g.click();var t=document.querySelector('.tab[data-t="${p.tab}"]');if(t)t.click();${JSON.stringify(p.sub)}.forEach(function(s){var b=document.querySelector('.sbtn[data-s="'+s+'"]');if(b)b.click()});setTimeout(function(){scrollTo(0,${p.y})},200)},120)})</script>`
const readPrev = (doc?: Document | null): Prev | null => {
  const a = doc?.querySelector('.tab.active'); if (!doc || !a || doc.getElementById('intro')?.getBoundingClientRect().height) return null
  return { tab: a.getAttribute('data-t') || 'inicio', sub: Array.from(doc.querySelectorAll('.sbtn.on')).map(b => b.getAttribute('data-s')), y: doc.scrollingElement?.scrollTop || 0 }
}

type Tab = 'general' | 'secciones' | 'alertas' | 'json' | 'versiones'
const TABS: [Tab, string][] = [['general', 'General'], ['secciones', 'Secciones'], ['alertas', 'Alertas'], ['json', 'JSON'], ['versiones', 'Versiones']]

function General({ d, set }: { d: Json; set: (d: Json) => void }) {
  return <div className="card"><MetaForm meta={d.meta} set={m => set({ ...d, meta: m })} /></div>
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
    {open === i && <SectionForm section={s} set={v => put(i, v)} />}
  </div>)}<button className="pri" onClick={add}>+ Agregar sección</button></>
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

export default function App() {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [id, setId] = useState<number | null>(null)
  const [d, setD] = useState<Json | null>(null)
  const [saved, setSaved] = useState('')
  const [tab, setTabS] = useState<Tab>(() => LS.get<Tab>('tab', 'general'))
  const setTab = (k: Tab) => { setTabS(k); LS.set('tab', k) }
  const [issues, setIssues] = useState<string[]>([])
  const [html, setHtml] = useState('')
  const [msg, setMsg] = useState('')
  const [vk, setVk] = useState(0)
  const [ready, setReady] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const seen = useRef(false)
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
      if (draft) { setD(draft); setMsg('Borrador sin guardar recuperado') } else setD(r.data)
    }).catch(() => LS.del('id'))
  }, [])
  useEffect(() => {  // guarda el borrador mientras haya cambios sin guardar
    if (id === null || d === null) return
    if (dirty) LS.set('draft.' + id, d); else LS.del('draft.' + id)
  }, [d, id, dirty])

  const open = useCallback(async (rid: number) => {
    if (dirty && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return
    const r = await api.get(rid); setId(rid); LS.set('id', rid); LS.del('prev'); seen.current = false; setD(LS.get<Json | null>('draft.' + rid, null) ?? r.data); setSaved(JSON.stringify(r.data)); setMsg(''); setVk(k => k + 1)
  }, [dirty])

  useEffect(() => {  // vista previa en vivo con retraso
    if (!d) return
    const t = setTimeout(async () => {
      const v = await api.validate(d).catch(() => null)
      if (!v) return
      setIssues(v.issues)
      if (v.ok) {
        let h = await api.render(d).catch(() => '')
        const doc = frame.current?.contentDocument
        const prev = (seen.current ? readPrev(doc) : null) || LS.get<Prev | null>('prev', null)
        if (h && prev) h = h.replace('</body>', restoreJs(prev) + '</body>')
        seen.current = true
        setHtml(h)
      }
    }, 700)
    return () => clearTimeout(t)
  }, [d])

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
    const r = await api.create(copy, 'Copia'); await refresh(); setId(r.id); LS.set('id', r.id); setD(r.data); setSaved(JSON.stringify(r.data))
  }
  const remove = async () => {
    if (id === null || !confirm('¿Eliminar este informe y todas sus versiones?')) return
    await api.remove(id); LS.del('id'); LS.del('draft.' + id); LS.del('prev'); setId(null); setD(null); refresh()
  }

  return <div className="app">
    <aside className="side"><h1>Report Studio</h1>
      <button className="pri" style={{ width: '100%', marginBottom: 12 }} onClick={create}>{d ? 'Duplicar informe' : 'Nuevo informe'}</button>
      <label style={{ cursor: 'pointer' }}>Importar JSON<input type="file" accept="application/json" style={{ display: 'none' }} onChange={async e => {
        const f = e.target.files?.[0]; if (!f) return
        try { const r = await api.create(JSON.parse(await f.text()), 'Importado'); await refresh(); open(r.id) } catch (x: any) { alert((x.issues || [x.message]).join('\n')) }
        e.target.value = ''
      }} /></label>
      {rows.map(r => <div key={r.id} className={'item' + (r.id === id ? ' on' : '')} onClick={() => open(r.id)}>{r.title}<small>v{r.version} · {new Date(r.updated).toLocaleDateString('es-CO')}</small></div>)}
      {!rows.length && <p className="mut">Aún no hay informes. Importa el JSON del seed para empezar.</p>}
    </aside>
    {ready && d && id !== null ? <div className="main">
      <div className="edit">
        <div className="bar"><button className="pri" disabled={!dirty || issues.length > 0} onClick={save}>Guardar</button>
          <a href={`/api/reports/${id}/export.html`}><button>HTML</button></a><a href={`/api/reports/${id}/export.pdf`}><button>PDF</button></a>
          <button className="danger" onClick={remove}>Eliminar</button>
          <span className="mut">{dirty ? 'Cambios sin guardar' : msg}</span></div>
        {issues.length > 0 && <div className="issues"><b>Corrige antes de guardar:</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{issues.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        {tab === 'general' && <General d={d} set={setD} />}
        {tab === 'secciones' && <Secciones d={d} set={setD} focus={goPreview} />}
        {tab === 'alertas' && <Alertas d={d} set={setD} />}
        {tab === 'json' && <JsonEditor d={d} set={setD} />}
        {tab === 'versiones' && <Versiones id={id} refreshKey={vk} onRestore={async () => { const r = await api.get(id); setD(r.data); setSaved(JSON.stringify(r.data)); setVk(k => k + 1); refresh() }} />}
      </div>
      <div className="prev"><iframe ref={frame} title="Vista previa" srcDoc={html} sandbox="allow-scripts allow-same-origin allow-modals allow-popups" /></div>
    </div> : <div className="empty">Elige un informe de la izquierda o importa uno.</div>}
  </div>
}
