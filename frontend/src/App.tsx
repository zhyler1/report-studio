import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, type Json, type ReportRow, type Version } from './api'

type Tab = 'general' | 'secciones' | 'alertas' | 'json' | 'versiones'
const TABS: [Tab, string][] = [['general', 'General'], ['secciones', 'Secciones'], ['alertas', 'Alertas'], ['json', 'JSON'], ['versiones', 'Versiones']]

function Field({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return <div><label>{label}</label>{area ? <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} /> : <input value={value ?? ''} onChange={e => onChange(e.target.value)} />}</div>
}

function General({ d, set }: { d: Json; set: (d: Json) => void }) {
  const m = d.meta, t = m.theme
  const sm = (k: string) => (v: any) => set({ ...d, meta: { ...m, [k]: v } })
  const st = (k: string) => (v: any) => set({ ...d, meta: { ...m, theme: { ...t, [k]: v } } })
  return <>
    <div className="card"><b>Encabezado y portada</b>
      <div className="grid2"><Field label="Título" value={m.title} onChange={sm('title')} /><Field label="Subtítulo (dependencia)" value={m.subtitle} onChange={sm('subtitle')} />
        <Field label="Entidad" value={m.org} onChange={sm('org')} /><Field label="Cargo de quien firma" value={m.boss_role} onChange={sm('boss_role')} /></div>
      <Field label="Nombre de quien firma" value={m.boss} onChange={sm('boss')} />
      <Field label="Línea bajo el título" value={m.tagline} onChange={sm('tagline')} />
      <Field label="Pie de página" value={m.footer} onChange={sm('footer')} /></div>
    <div className="card"><b>Inicio</b>
      <Field label="Rótulo superior" value={m.hero_kicker} onChange={sm('hero_kicker')} />
      <Field label="Título del inicio" value={m.hero_title} onChange={sm('hero_title')} />
      <Field label="Texto" value={m.hero_text} onChange={sm('hero_text')} area />
      <Field label="Enlace para el QR (dirección donde publicarás el informe)" value={m.share_url} onChange={sm('share_url')} />
      <label><input type="checkbox" style={{ width: 'auto' }} checked={!!m.show_alerts} onChange={e => sm('show_alerts')(e.target.checked)} /> Mostrar la pestaña y tarjeta de Alertas</label></div>
    <div className="card"><b>Apariencia</b>
      <div className="grid2"><div><label>Tema inicial</label><select value={t.default} onChange={e => st('default')(e.target.value)}><option value="light">Claro</option><option value="dark">Oscuro</option></select></div>
        <div><label>Portada</label><select value={t.cover} onChange={e => st('cover')(e.target.value)}><option value="foto">Con foto</option><option value="clasica">Clásica</option></select></div></div>
      <Field label="Palabra animada de la portada" value={t.intro_word} onChange={st('intro_word')} />
      <Field label="Logo (fondo oscuro)" value={t.logo_dark} onChange={st('logo_dark')} />
      <Field label="Logo (fondo claro)" value={t.logo_light} onChange={st('logo_light')} />
      <Field label="Foto del palacio (dirección)" value={t.palace_url} onChange={st('palace_url')} /></div>
  </>
}

function Secciones({ d, set }: { d: Json; set: (d: Json) => void }) {
  const secs: Json[] = d.sections
  const [open, setOpen] = useState<number | null>(null)
  const put = (i: number, s: Json) => set({ ...d, sections: secs.map((x, k) => (k === i ? s : x)) })
  const move = (i: number, dx: number) => {
    const a = [...secs]; const j = i + dx
    if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]; set({ ...d, sections: a })
  }
  return <>{secs.map((s, i) => <div className="card" key={s.id}>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <b style={{ flex: 1 }}>{s.label} <span className="mut">· {s.id}{s.hidden ? ' · oculta' : ''}</span></b>
      <button onClick={() => move(i, -1)} aria-label="Subir">↑</button><button onClick={() => move(i, 1)} aria-label="Bajar">↓</button>
      <button onClick={() => setOpen(open === i ? null : i)}>{open === i ? 'Cerrar' : 'Editar'}</button></div>
    {open === i && <>
      <div className="grid2"><Field label="Texto de la pestaña" value={s.label} onChange={v => put(i, { ...s, label: v })} /><Field label="Título" value={s.title} onChange={v => put(i, { ...s, title: v })} /></div>
      <Field label="Subtítulo" value={s.subtitle} onChange={v => put(i, { ...s, subtitle: v })} />
      <label><input type="checkbox" style={{ width: 'auto' }} checked={!!s.hidden} onChange={e => put(i, { ...s, hidden: e.target.checked })} /> Ocultar esta sección</label>
      <p className="mut">El contenido de la sección ({s.tabs?.length ? `${s.tabs.length} pestañas` : `${s.blocks?.length || 0} bloques`}) se edita por ahora en la pestaña JSON; los formularios por bloque vienen enseguida.</p></>}
  </div>)}</>
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
  const [tab, setTab] = useState<Tab>('general')
  const [issues, setIssues] = useState<string[]>([])
  const [html, setHtml] = useState('')
  const [msg, setMsg] = useState('')
  const [vk, setVk] = useState(0)
  const dirty = useMemo(() => d !== null && JSON.stringify(d) !== saved, [d, saved])

  const refresh = useCallback(() => api.list().then(setRows), [])
  useEffect(() => { refresh() }, [refresh])

  const open = useCallback(async (rid: number) => {
    if (dirty && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return
    const r = await api.get(rid); setId(rid); setD(r.data); setSaved(JSON.stringify(r.data)); setMsg(''); setVk(k => k + 1)
  }, [dirty])

  useEffect(() => {  // vista previa en vivo con retraso
    if (!d) return
    const t = setTimeout(async () => {
      const v = await api.validate(d).catch(() => null)
      if (!v) return
      setIssues(v.issues)
      if (v.ok) setHtml(await api.render(d).catch(() => ''))
    }, 700)
    return () => clearTimeout(t)
  }, [d])

  const save = async () => {
    if (!d || id === null) return
    const note = prompt('¿Qué cambió? (opcional)') ?? ''
    try { const r = await api.save(id, d, note); setSaved(JSON.stringify(r.data)); setMsg('Guardado como versión ' + r.version); setVk(k => k + 1); refresh() }
    catch (e: any) { setIssues(e.issues?.length ? e.issues : [e.message]) }
  }
  const create = async () => {
    if (!d) { alert('Importa un JSON para crear el primer informe; luego podrás duplicarlo.'); return }
    const copy = JSON.parse(JSON.stringify(d))
    const r = await api.create(copy, 'Copia'); await refresh(); setId(r.id); setD(r.data); setSaved(JSON.stringify(r.data))
  }
  const remove = async () => {
    if (id === null || !confirm('¿Eliminar este informe y todas sus versiones?')) return
    await api.remove(id); setId(null); setD(null); refresh()
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
    {d && id !== null ? <div className="main">
      <div className="edit">
        <div className="bar"><button className="pri" disabled={!dirty || issues.length > 0} onClick={save}>Guardar</button>
          <a href={`/api/reports/${id}/export.html`}><button>HTML</button></a><a href={`/api/reports/${id}/export.pdf`}><button>PDF</button></a>
          <button className="danger" onClick={remove}>Eliminar</button>
          <span className="mut">{dirty ? 'Cambios sin guardar' : msg}</span></div>
        {issues.length > 0 && <div className="issues"><b>Corrige antes de guardar:</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{issues.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        {tab === 'general' && <General d={d} set={setD} />}
        {tab === 'secciones' && <Secciones d={d} set={setD} />}
        {tab === 'alertas' && <Alertas d={d} set={setD} />}
        {tab === 'json' && <JsonEditor d={d} set={setD} />}
        {tab === 'versiones' && <Versiones id={id} refreshKey={vk} onRestore={async () => { const r = await api.get(id); setD(r.data); setSaved(JSON.stringify(r.data)); setVk(k => k + 1); refresh() }} />}
      </div>
      <div className="prev"><iframe title="Vista previa" srcDoc={html} sandbox="allow-scripts allow-same-origin allow-modals allow-popups" /></div>
    </div> : <div className="empty">Elige un informe de la izquierda o importa uno.</div>}
  </div>
}
