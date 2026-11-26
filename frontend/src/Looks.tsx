import { useEffect, useState } from 'react'

type L = { key: string; label: string; group: string; fam: string }
let cache: { css: string; looks: L[] } | null = null

// Variables de color de la paleta activa, para que cada muestra se vea como se verá en el informe
function vars(c: [string, string, string]): React.CSSProperties {
  return { '--blue': c[0], '--navy': `color-mix(in srgb,${c[0]} 72%,#000)`, '--yellow': c[1], '--gold': `color-mix(in srgb,${c[1]} 78%,#fff)`, '--red': c[2], '--green': '#1E8A4C', '--panel': '#fff', '--text': '#14243F', '--border': '#E5E7EB', '--shadow': '0 6px 14px rgba(20,36,63,.12)', '--card': '#fff', '--muted': '#4A566E', '--head': '#14243F' } as React.CSSProperties
}

export function useLooks() {
  const [d, setD] = useState(cache)
  useEffect(() => {
    if (cache) return
    fetch('/api/looks').then(r => r.json()).then(j => {
      cache = j
      if (!document.getElementById('rs-looks-css')) { const st = document.createElement('style'); st.id = 'rs-looks-css'; st.textContent = j.css; document.head.appendChild(st) }
      setD(j)
    }).catch(() => { /* sin catálogo: el selector queda vacío */ })
  }, [])
  return d
}

function Muestra({ l, pal, on, pick }: { l: L; pal: [string, string, string]; on: boolean; pick: () => void }) {
  return <button className={'lkc' + (on ? ' on' : '')} title={l.label} onClick={pick}>
    <span className="lkprev" style={vars(pal)}><span className={`rs-lk rs-l-${l.key} rs-f${l.fam}`} style={{ margin: 0, padding: 7, borderRadius: undefined }}><span className="card" style={{ padding: '4px 8px', borderRadius: 8, display: 'block', fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>71 %</span></span></span>
    <small>{l.label}</small></button>
}

export function LookPicker({ value, onPick, pal }: { value: string; onPick: (k: string) => void; pal: [string, string, string] }) {
  const d = useLooks()
  const [open, setOpen] = useState(false)
  const rapidos = ['solido', 'degradado', 'acento', 'suave', 'cristal', 'oscuro']
  const groups = d ? Array.from(new Set(d.looks.map(x => x.group))) : []
  const actual = d?.looks.find(x => x.key === value)
  return <div className="lkbox">
    <div className="lkrow">
      <button className={'lkc' + (!value ? ' on' : '')} title="Sin estilo (el normal del tema)" onClick={() => onPick('')}><span className="lkprev"><span className="lkno">Aa</span></span><small>Normal</small></button>
      {d && rapidos.map(k => { const l = d.looks.find(x => x.key === k); return l ? <Muestra key={k} l={l} pal={pal} on={value === k} pick={() => onPick(k)} /> : null })}
      <button className={'lkmore' + (open ? ' on' : '')} onClick={() => setOpen(o => !o)} title="Ver todos los estilos">{actual && !rapidos.includes(value) ? actual.label + ' · ' : ''}Todos los estilos ({d?.looks.length || 0}) {open ? '▴' : '▾'}</button>
    </div>
    {open && d && <div className="lkpop">
      <div className="lkpop-h"><b>Elige un estilo</b><span>Se ve con los colores del tema actual</span><button onClick={() => setOpen(false)}>Cerrar ✕</button></div>
      <div className="lkpop-b">
        <div className="lkg"><div className="lkgt">Sin estilo</div><div className="lkgrid"><button className={'lkc' + (!value ? ' on' : '')} onClick={() => { onPick(''); setOpen(false) }}><span className="lkprev"><span className="lkno">Aa</span></span><small>Normal</small></button></div></div>
        {groups.map(g => <div className="lkg" key={g}><div className="lkgt">{g}</div><div className="lkgrid">{d.looks.filter(x => x.group === g).map(l => <Muestra key={l.key} l={l} pal={pal} on={value === l.key} pick={() => { onPick(l.key); setOpen(false) }} />)}</div></div>)}
      </div>
    </div>}
  </div>
}
