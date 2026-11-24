import { useEffect, useState } from 'react'
import { api, type Json } from './api'
import { BLOCK } from './labels'

const brief = (b: Json): string => {
  const t = b.title || b.header || b.items?.[0]?.label || b.items?.[0]?.title || (typeof b.items?.[0] === 'string' ? b.items[0] : '') || ''
  const n = b.items?.length ?? b.rows?.length ?? b.series?.length
  return `${String(t).slice(0, 70)}${n ? ` · ${n} elementos` : ''}`
}

// Cada línea «## Tema» abre un tema; el texto anterior al primero se ignora si es muy corto.
export const splitThemes = (t: string): { label: string; text: string }[] => {
  const out: { label: string; text: string }[] = []
  let cur: { label: string; lines: string[] } | null = null
  for (const l of t.split('\n')) {
    const m = l.match(/^\s*##\s+(.+?)\s*$/)
    if (m) { if (cur) out.push({ label: cur.label, text: cur.lines.join('\n').trim() }); cur = { label: m[1].replace(/\s*#+$/, ''), lines: [] } } else if (cur) cur.lines.push(l)
  }
  if (cur) out.push({ label: cur.label, text: cur.lines.join('\n').trim() })
  return out.filter(x => x.text.length >= 3)
}

export default function Loader({ sections, defSection, onAdd, onOpenReport, onClose }: {
  sections: { id?: string; label: string; tabs?: { label?: string }[] }[]; defSection: number
  onAdd: (si: number, blocks: Json[], ti?: number, porTema?: boolean) => void; onOpenReport: (d: Json) => void; onClose: () => void
}) {
  const [engine, setEngine] = useState<string | null | undefined>(undefined)
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [hint, setHint] = useState('')
  const [si, setSi] = useState(defSection)
  const [ti, setTi] = useState(0)   // pestaña interna de la sección (p. ej. Bienestar: Actividades, Calendario…)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [res, setRes] = useState<{ blocks: Json[]; issues: string[] } | null>(null)
  const [ok, setOk] = useState<boolean[]>([])
  const [porTema, setPorTema] = useState(true)
  const themes = splitThemes(text)
  const usaTemas = porTema && themes.length >= 2
  useEffect(() => { api.ingestStatus().then(s => setEngine(s.engine)).catch(() => setEngine(null)) }, [])

  const pick = async (f: File) => {
    setErr(''); setRes(null); setBusy('Leyendo el archivo…')
    try {
      const r = await api.extract(f)
      if (r.report) { if (confirm('Este archivo es un informe exportado de Report Studio. ¿Abrirlo como informe nuevo (con todo su contenido)?')) { onOpenReport(r.report); return } }
      setName(r.name); setText(r.text)
    } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }
  const analyze = async () => {
    setErr(''); setBusy(engine ? 'Analizando con IA… puede tardar un minuto' : 'Leyendo…')
    try {
      if (usaTemas) {   // una consulta por tema; cada casilla queda marcada con su tema para crear un botón (pestaña) por tema
        const blocks: Json[] = []; const issues: string[] = []
        for (let k = 0; k < themes.length; k++) {
          setBusy(`Tema ${k + 1} de ${themes.length}: ${themes[k].label}…`)
          const r = await api.propose(themes[k].text, [hint, themes[k].label].filter(Boolean).join(' · '), sections[si]?.id || '')
          r.blocks.forEach((b: Json) => blocks.push({ ...b, _tema: themes[k].label }))
          r.issues.forEach((x: string) => issues.push(`${themes[k].label}: ${x}`))
        }
        setRes({ blocks, issues }); setOk(blocks.map(() => true))
      } else { const r = await api.propose(text, hint, sections[si]?.id || ''); setRes(r); setOk(r.blocks.map(() => true)) }
    } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }
  const chosen = res ? res.blocks.filter((_, i) => ok[i]) : []

  return <div className="modal" onClick={onClose}><div className="modal-b" style={{ width: 'min(680px,94vw)', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
    <h2 style={{ marginTop: 0 }}>📥 Cargar datos desde un documento</h2>
    <p className="mut" style={{ marginTop: 0 }}>Sube el PDF, Word, PowerPoint, Excel o HTML que te enviaron, o pega el texto. La herramienta arma las casillas y tú eliges cuáles agregar.
      {engine === undefined ? '' : engine ? ` Lectura con IA (${engine === 'anthropic' ? 'Claude' : 'Llama local'}).` : ' Sin IA configurada: lectura básica de tablas, listas y cifras sueltas.'}</p>
    {!res && <>
      <label className="drop"><input type="file" style={{ display: 'none' }} accept=".pdf,.docx,.pptx,.xlsx,.html,.htm,.txt,.md,.csv" onChange={e => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = '' }} />
        <b>{name ? `✔ ${name}` : 'Elegir archivo (PDF, Word, PPT, Excel, HTML, texto)'}</b></label>
      <p className="mut" style={{ margin: '10px 0 4px' }}>o pega el texto aquí</p>
      <textarea style={{ minHeight: 140 }} value={text} onChange={e => setText(e.target.value)} placeholder="Pega aquí el contenido del informe del grupo…" />
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="mut">Agregar a la sección</label>
        <select style={{ width: 'auto' }} value={si} onChange={e => { setSi(Number(e.target.value)); setTi(0) }}>{sections.map((s, i) => <option key={i} value={i}>{s.label}</option>)}</select>
        {themes.length >= 2 && <label className="mut" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={porTema} onChange={e => setPorTema(e.target.checked)} />un botón (pestaña) por tema ({themes.length})</label>}
        {!usaTemas && !!sections[si]?.tabs?.length && <><label className="mut">en la pestaña</label><select style={{ width: 'auto' }} value={ti} onChange={e => setTi(Number(e.target.value))}>{sections[si].tabs!.map((t, i) => <option key={i} value={i}>{t.label || 'Pestaña ' + (i + 1)}</option>)}</select></>}
        <input style={{ flex: 1, minWidth: 180 }} value={hint} onChange={e => setHint(e.target.value)} placeholder="¿De qué trata? (opcional, ayuda a la IA)" />
      </div>
      {err && <div className="issues" style={{ marginTop: 10 }}>{err}</div>}
      <div style={{ textAlign: 'right', marginTop: 12 }}><span className="mut">{busy}</span> <button onClick={onClose}>Cancelar</button> <button className="pri" disabled={text.trim().length < 10 || !!busy} onClick={analyze}>Analizar</button></div>
    </>}
    {res && <>
      {res.issues.length > 0 && <div className="issues" style={{ marginBottom: 10 }}><ul style={{ margin: 0, paddingLeft: 18 }}>{res.issues.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {!res.blocks.length && <p>No se encontraron casillas. Prueba con otro archivo o pega el texto.</p>}
      {res.blocks.map((b, i) => <label key={i} className="sub-card" style={{ display: 'flex', gap: 10, padding: 10, alignItems: 'center', cursor: 'pointer' }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={ok[i]} onChange={e => setOk(ok.map((x, j) => (j === i ? e.target.checked : x)))} />
        <span>{b._tema && <span className="mut">{b._tema} · </span>}<b>{BLOCK[b.type] || b.type}</b><br /><span className="mut">{brief(b)}</span></span></label>)}
      <div style={{ textAlign: 'right', marginTop: 12 }}><button onClick={() => setRes(null)}>← Volver</button> <button className="pri" disabled={!chosen.length} onClick={() => onAdd(si, chosen, ti, usaTemas)}>Agregar {chosen.length} casilla{chosen.length === 1 ? '' : 's'} a «{sections[si]?.label}»</button></div>
    </>}
  </div></div>
}
