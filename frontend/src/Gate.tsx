import { useEffect, useState } from 'react'
import App from './App.tsx'

type Me = { open: boolean; name: string; role: string; sections: string[]; modo?: string }

/** Pide ingreso solo cuando el servidor ya tiene usuarios; en modo local abre directo. */
export default function Gate() {
  const [me, setMe] = useState<Me | null | undefined>(undefined)
  const [name, setName] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  const load = () => fetch('/api/me').then(r => (r.ok ? r.json() : null)).then(setMe).catch(() => setMe(null))
  useEffect(() => { load() }, [])
  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, password: pw }) })
    if (r.ok) load(); else setErr((await r.json().catch(() => ({}))).detail || 'No se pudo ingresar')
  }
  const out = async () => { await fetch('/api/logout', { method: 'POST' }); setMe(null) }
  if (me === undefined) return null
  if (!me) return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: '#f4f6fa' }}>
      <form onSubmit={login} style={{ background: '#fff', padding: 32, borderRadius: 16, boxShadow: '0 10px 30px rgba(20,36,63,.12)', width: 320, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Report Studio</h2>
        <input placeholder="Usuario" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <input placeholder="Contraseña" type="password" value={pw} onChange={e => setPw(e.target.value)} />
        {err && <div style={{ color: '#C62828', fontSize: 13 }}>{err}</div>}
        <button type="submit" style={{ background: '#1A3A6B', color: '#fff', border: 0, borderRadius: 10, padding: 10, fontWeight: 700, cursor: 'pointer' }}>Ingresar</button>
      </form>
    </div>
  )
  return <>
    {!me.open && <div style={{ position: 'fixed', right: 12, bottom: 10, zIndex: 9999, font: '600 12px system-ui', background: '#0f1b33', color: '#fff', padding: '6px 12px', borderRadius: 20 }}>
      {me.name} · {me.role === 'admin' ? 'administrador' : `líder (${me.sections.join(', ') || 'sin secciones'})`} · <a href="#" style={{ color: '#FDC800' }} onClick={e => { e.preventDefault(); out() }}>Salir</a></div>}
    <App servidorPersonal={me.modo === 'personal'} />
  </>
}
