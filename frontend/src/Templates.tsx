import { useEffect, useState } from 'react'
import { api, type Json, type Tpl } from './api'

const strip = (o: Json): Json => {  // casillas nuevas sin id (para que no choquen con las del informe)
  if (Array.isArray(o)) return o.map(strip)
  if (o && typeof o === 'object') { const c: Json = {}; for (const [k, v] of Object.entries(o)) if (!(k === 'id' && 'type' in o)) c[k] = strip(v); return c }
  return o
}
export const cloneBlocks = (sec: Json): Json[] => strip(JSON.parse(JSON.stringify(sec.blocks?.length ? sec.blocks : sec.tabs?.[0]?.blocks || []))) as Json[]

export default function Templates({ current, onAdd, onNew, onClose, flash }: {
  current: Json | null   // sección que se está viendo (para guardarla como plantilla)
  onAdd: (blocks: Json[]) => void; onNew: (sec: Json, name: string) => void; onClose: () => void; flash: (m: string) => void
}) {
  const [list, setList] = useState<Tpl[]>([]); const [name, setName] = useState(''); const [busy, setBusy] = useState(false)
  const load = () => api.templates().then(setList).catch(e => flash(e.message))
  useEffect(() => { load() }, [])
  const save = async () => {
    if (!current || !name.trim()) return
    setBusy(true)
    try {
      const { label, title, subtitle, icon, blocks, tabs } = current
      await api.addTemplate(name.trim(), strip(JSON.parse(JSON.stringify({ label, title, subtitle, icon, blocks, tabs }))))
      setName(''); await load(); flash('Plantilla guardada')
    } catch (e: any) { flash((e.issues?.length ? e.issues : [e.message]).join(' · ')) }
    setBusy(false)
  }
  const del = async (t: Tpl) => { if (!confirm('¿Borrar la plantilla «' + t.name + '»?')) return; try { await api.delTemplate(t.id); load() } catch (e: any) { flash(e.message) } }
  return <div className="modal" onClick={onClose}><div className="modal-b" style={{ width: 'min(680px,94vw)', maxHeight: '86vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
    <div style={{ display: 'flex', alignItems: 'center' }}><h2 style={{ margin: 0, flex: 1 }}>Plantillas de sección</h2><button onClick={onClose}>✕</button></div>
    <p className="mut">Un arreglo de casillas listo para usar. Agrégalo a la sección que estás viendo o crea una sección nueva con él.</p>
    {list.map(t => <div key={t.id} className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
      <div style={{ flex: 1 }}><b>{t.name}</b>{t.builtin && <small className="mut"> · incluida</small>}<div className="mut" style={{ fontSize: 12 }}>{t.desc || `${cloneBlocks(t.section).length} casillas`}</div></div>
      <button className="pri" onClick={() => { onAdd(cloneBlocks(t.section)); onClose() }}>Agregar aquí</button>
      <button onClick={() => { onNew(strip(JSON.parse(JSON.stringify(t.section))), t.name); onClose() }}>Sección nueva</button>
      {!t.builtin && <button title="Borrar plantilla" onClick={() => del(t)}>🗑</button>}
    </div>)}
    <h3 style={{ marginBottom: 6 }}>Guardar la sección actual</h3>
    {current ? <div style={{ display: 'flex', gap: 8 }}>
      <input style={{ flex: 1 }} placeholder={`Nombre (se guarda «${current.label}» con sus ${current.blocks?.length || 0} casillas)`} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
      <button className="pri" disabled={busy || !name.trim()} onClick={save}>Guardar plantilla</button></div>
      : <p className="mut">Abre una sección en la vista previa para guardarla como plantilla.</p>}
  </div></div>
}
