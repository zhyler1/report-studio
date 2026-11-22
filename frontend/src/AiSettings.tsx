import { useEffect, useState } from 'react'

type St = { engine: string | null; source: string; key_hint: string; model: string }
const call = async (m: string, body?: unknown) => {
  const r = await fetch('/api/ai' + (m === 'POST' ? '/test' : ''), { method: m === 'POST' ? 'POST' : m, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error ' + r.status)
  return r.status === 204 ? null : r.json()
}

/** Clave de la API de Claude para «Cargar documento». Solo la ve el administrador; el servidor nunca devuelve la clave completa. */
export default function AiSettings() {
  const [st, setSt] = useState<St | null>(null)
  const [key, setKey] = useState(''); const [model, setModel] = useState('')
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const load = () => call('GET').then((s: St) => { setSt(s); setModel(s.model) }).catch(e => setMsg(e.message))
  useEffect(() => { load() }, [])
  const run = async (f: () => Promise<unknown>, ok: string) => { setBusy(true); setMsg(''); try { await f(); setMsg(ok); setKey(''); await load() } catch (e: any) { setMsg('⚠ ' + e.message) } finally { setBusy(false) } }
  return <div className="card">
    <p className="mut" style={{ marginTop: 0 }}>Con la clave, «Cargar documento» lee los textos con Claude y arma las casillas. Sin clave usa la lectura básica. La clave se guarda solo en este computador y no se sube a GitHub. Los textos que cargues con IA se envían a Anthropic para procesarlos.</p>
    <p><b>Estado:</b> {st === null ? 'consultando…' : st.engine === 'anthropic' ? `Claude activo (clave ${st.key_hint}, guardada en ${st.source})` : st.engine === 'ollama' ? 'Llama local' : 'Sin clave: lectura básica'}</p>
    {st?.source === 'entorno' && <p className="mut">La clave viene de la variable de entorno del servidor; esa tiene prioridad sobre la que guardes aquí.</p>}
    <div className="fld"><label>Clave de la API de Anthropic</label><input type="password" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} placeholder={st?.key_hint ? 'Ya hay una clave; pega otra solo para reemplazarla' : 'sk-ant-…'} /></div>
    <div className="fld"><label>Modelo (opcional)</label><input value={model} onChange={e => setModel(e.target.value)} placeholder="claude-sonnet-5-5" /></div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
      <button className="pri" disabled={busy || (!key.trim() && !st?.key_hint)} onClick={() => run(() => call('PUT', { key, model }), 'Guardado')}>Guardar</button>
      <button disabled={busy || st?.engine !== 'anthropic'} onClick={() => run(() => call('POST'), '✔ La clave funciona')}>Probar</button>
      <button className="danger" disabled={busy || st?.source !== 'herramienta'} onClick={() => confirm('¿Quitar la clave guardada en este computador?') && run(() => call('DELETE'), 'Clave quitada')}>Quitar</button>
    </div>
    {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
  </div>
}
