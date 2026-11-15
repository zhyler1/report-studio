// Edición directa sobre la vista previa: selección de casillas, barra de acciones y edición de texto con doble clic.
import { BLOCK } from './labels'
type Json = any
export type Host = {
  get(): Json
  put(d: Json): void
  select(p: string | null): void
  sel(): string | null
  add(listPath: string, index?: number): void
  kinds: string[]
  toast(m: string): void
}

export const getAt = (d: Json, p: string) => p.split('.').filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), d)
export const setAt = (d: Json, p: string, v: Json): Json => {
  const ks = p.split('.').filter(Boolean)
  if (!ks.length) return v
  const rec = (o: Json, i: number): Json => {
    const c = Array.isArray(o) ? [...o] : { ...o }
    c[ks[i]] = i === ks.length - 1 ? v : rec(o[ks[i]], i + 1)
    return c
  }
  return rec(d, 0)
}
const parentOf = (p: string) => { const k = p.split('.'); const i = Number(k.pop()); return { list: k.join('.'), i } }

/** ¿La casilla `p` está bloqueada, o está dentro de otra bloqueada? */
export const lockedAt = (d: Json, p: string | null): boolean => {
  if (!p) return false
  const k = p.split('.'); let acc = ''
  for (const x of k) { acc = acc ? acc + '.' + x : x; if (getAt(d, acc)?.locked === true) return true }
  return false
}

export const listOps = {
  move(d: Json, p: string, dx: number): Json {
    const { list, i } = parentOf(p); const a = [...getAt(d, list)]; const j = i + dx
    if (j < 0 || j >= a.length) return d
    ;[a[i], a[j]] = [a[j], a[i]]; return setAt(d, list, a)
  },
  /** Mueve la casilla `p` a antes (after=false) o después de la casilla `to`; puede cambiar de lista. */
  moveTo(d: Json, p: string, to: string, after: boolean): { d: Json; path: string } | null {
    const s = parentOf(p), t = parentOf(to)
    if (p === to || t.list === p || t.list.startsWith(p + '.')) return null            // no soltar dentro de sí misma
    if (s.list !== t.list && (s.list.startsWith(t.list + '.') || t.list.startsWith(s.list + '.'))) return null  // listas anidadas: ambiguo
    const item = getAt(d, p); let j = t.i + (after ? 1 : 0)
    if (s.list === t.list) {
      const a = [...getAt(d, s.list)]; a.splice(s.i, 1); if (s.i < j) j--; a.splice(j, 0, item)
      return { d: setAt(d, s.list, a), path: s.list + '.' + j }
    }
    const from = getAt(d, s.list).filter((_: Json, k: number) => k !== s.i)
    const dst = [...(getAt(d, t.list) || [])]; dst.splice(j, 0, item)
    return { d: setAt(setAt(d, s.list, from), t.list, dst), path: t.list + '.' + j }
  },
  dup(d: Json, p: string): Json {
    const { list, i } = parentOf(p); const a = [...getAt(d, list)]
    a.splice(i + 1, 0, JSON.parse(JSON.stringify(a[i]))); return setAt(d, list, a)
  },
  del(d: Json, p: string): Json {
    const { list, i } = parentOf(p); return setAt(d, list, getAt(d, list).filter((_: Json, k: number) => k !== i))
  },
  insert(d: Json, list: string, i: number, b: Json): Json {
    const a = [...(getAt(d, list) || [])]; a.splice(i, 0, b); return setAt(d, list, a)
  },
}

// ── edición de texto: localizar el dato que originó el texto mostrado ──
const norm = (s: string) => s.replace(/\*\*/g, '').replace(/[\s.,$%]/g, '').toLowerCase()
type Leaf = { path: string; display: string; pre: string; suf: string; num: boolean }
function leaves(o: Json, p = '', out: Leaf[] = []): Leaf[] {
  if (Array.isArray(o)) o.forEach((x, i) => leaves(x, p ? p + '.' + i : String(i), out))
  else if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if (k === 'type' || k === 'id' || k === 'src' || k === 'url' || k === 'slot' || k === 'poster') continue
      const q = p ? p + '.' + k : k
      if (typeof v === 'string') out.push({ path: q, display: v, pre: '', suf: '', num: false })
      else if (typeof v === 'number') out.push({ path: q, display: (k === 'value' ? (o.prefix || '') : '') + String(v) + (k === 'value' ? (o.suffix || '') : ''), pre: k === 'value' ? o.prefix || '' : '', suf: k === 'value' ? o.suffix || '' : '', num: true })
      else leaves(v, q, out)
      if (typeof v === 'string' && k === 'value' && (o.prefix || o.suffix)) out[out.length - 1].display = (o.prefix || '') + v + (o.suffix || ''), (out[out.length - 1].pre = o.prefix || ''), (out[out.length - 1].suf = o.suffix || '')
    }
  }
  return out
}
export function applyText(d: Json, blockPath: string, old: string, k: number, neu: string): Json | null {
  const b = getAt(d, blockPath)
  const m = leaves(b).filter(l => norm(l.display) === norm(old) || norm(l.display).replace(/\d/g, '') === '' && norm(l.display) === norm(old))
  const l = m[Math.min(k, m.length - 1)]
  if (!l) return null
  let v: Json = neu
  if (l.pre && v.startsWith(l.pre)) v = v.slice(l.pre.length)
  if (l.suf && v.endsWith(l.suf)) v = v.slice(0, -l.suf.length)
  if (l.num) { const n = Number(String(v).replace(/\./g, '').replace(',', '.')); if (Number.isNaN(n)) return null; v = n }
  return setAt(d, blockPath + '.' + l.path, v)
}

// texto con colores parciales: los <span data-rc> se vuelven {{#hex|texto}}
const ser = (x: Node): string => {
  let s = ''
  x.childNodes.forEach(n => {
    if (n.nodeType === 3) s += n.nodeValue
    else if (n.nodeName === 'BR') s += '\n'
    else { const e = n as HTMLElement; const c = e.getAttribute?.('data-rc'); const i = ser(e); s += c ? `{{${c}|${i}}}` : i }
  })
  return s
}
const isLeaf = (x: Element) => !x.querySelector('*:not(b):not(br):not([data-rc])')
export const VIZ_BUD: [string, string][] = [['donut', 'Dona (original)'], ['gauge', 'Medidor'], ['radialbar', 'Anillo de gráfico'], ['bullet', 'Barra con meta'], ['bar', 'Barra'], ['kpi', 'Cifra grande']]
export const VIZ_PLA: [string, string][] = [['bars', 'Barra apilada (original)'], ['donut', 'Dona'], ['bar', 'Barras'], ['kpi', 'Cifra grande']]
export const VIZ: [string, string][] = [['ring', 'Anillo (original)'], ['gauge', 'Medidor'], ['radialbar', 'Anillo de gráfico'], ['donut', 'Dona'], ['bullet', 'Barra con meta'], ['bar', 'Barra'], ['kpi', 'Cifra grande']]
const COLORS = ['#C62828', '#E8711A', '#FDC800', '#2E9E5B', '#1F5FAF', '#7C3AED', '#14243F', '#FFFFFF']

const CSS = `
.rs-add{margin:14px 0;padding:18px;border:2px dashed #9db4d8;border-radius:14px;text-align:center;color:#2160b0;font:600 14px Inter,system-ui,sans-serif;cursor:pointer;background:rgba(33,96,176,.04)}
.rs-add:hover{background:rgba(33,96,176,.12)}
#rsHov,#rsSel{position:absolute;pointer-events:none;border-radius:10px;z-index:99990;display:none}
#rsHov{outline:2px dashed #2160b0;outline-offset:2px}#rsSel{outline:3px solid #E8711A;outline-offset:2px}
#rsHov b{pointer-events:auto;cursor:grab;touch-action:none;user-select:none;position:absolute;top:8px;left:8px;background:#2160b0;color:#fff;font:700 12px Inter,system-ui,sans-serif;padding:6px 12px;border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,.3);white-space:nowrap}
#rsHov b.lk{background:#475569}
.rs-b[data-lk]{}
#rsBar{position:absolute;z-index:99999;display:none;gap:4px;background:#0f1b33;padding:5px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.35);align-items:center}
#rsBar button,#rsBar select{font:600 12px Inter,system-ui,sans-serif;border:0;border-radius:6px;padding:5px 8px;background:#26385c;color:#fff;cursor:pointer}
#rsBar button:hover{background:#3a5288}#rsBar .x{background:#a82a2a}
[contenteditable=true]{outline:2px solid #E8711A!important;outline-offset:3px;background:rgba(232,113,26,.08);cursor:text}
#rsDrop{position:absolute;z-index:99998;display:none;background:#E8711A;border-radius:3px;pointer-events:none;box-shadow:0 0 0 3px rgba(232,113,26,.25)}
.rs-tabdrop{outline:3px solid #E8711A!important;outline-offset:2px;background:rgba(232,113,26,.15)!important}
#rsGhost{position:fixed;z-index:100000;pointer-events:none;display:none;background:#E8711A;color:#fff;font:700 13px Inter,system-ui,sans-serif;padding:8px 14px;border-radius:12px;box-shadow:0 10px 28px rgba(0,0,0,.35);transform:translate(14px,14px);white-space:nowrap}
body.rs-dragmode,body.rs-dragmode *{cursor:grabbing!important;user-select:none!important}
body.rs-dragmode .tab{outline:2px dashed #E8711A;outline-offset:2px}
#rsDrop{box-shadow:0 0 0 4px rgba(232,113,26,.28)!important}
#rsDrop em{position:absolute;top:-24px;left:0;background:#E8711A;color:#fff;font:700 11px Inter,system-ui,sans-serif;font-style:normal;padding:3px 9px;border-radius:7px;white-space:nowrap}.rs-drag{cursor:grab!important}.rs-b.rs-dragging{opacity:.45}
#rsTx{position:absolute;z-index:99999;display:none;gap:6px;background:#0f1b33;padding:6px 8px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.35);align-items:center;color:#fff;font:600 11px Inter,system-ui,sans-serif}
#rsTx i{width:20px;height:20px;border-radius:50%;border:2px solid #fff;cursor:pointer;display:inline-block}#rsTx i:hover{transform:scale(1.2)}
#rsTx input[type=color],#rsBar input[type=color]{width:26px;height:24px;padding:0;border:0;background:none;cursor:pointer}
#rsTx button{font:600 11px Inter,system-ui,sans-serif;border:0;border-radius:6px;padding:4px 7px;background:#26385c;color:#fff;cursor:pointer}
#rsBar label{display:flex;align-items:center;gap:3px;color:#fff;font:600 11px Inter,system-ui,sans-serif}
.rs-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0f1b33;color:#fff;padding:10px 16px;border-radius:10px;font:600 13px Inter,system-ui,sans-serif;z-index:99999}
`

export function attach(doc: Document, h: Host) {
  if (!doc.body || doc.getElementById('rsBar')) return
  const st = doc.createElement('style'); st.textContent = CSS; doc.head.appendChild(st)
  const mk = (id: string) => { const e = doc.createElement('div'); e.id = id; doc.body.appendChild(e); return e }
  const hov = mk('rsHov'), sel = mk('rsSel'), bar = mk('rsBar'), tx = mk('rsTx'), drop = mk('rsDrop')
  const win = doc.defaultView!
  const rectOf = (el: Element) => {
    let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9
    const add = (r: DOMRect) => { if (!r.width && !r.height) return; x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom) }
    Array.from(el.children).forEach(c => add(c.getBoundingClientRect()))
    if (x1 > x2) return null
    return { l: x1 + win.scrollX, t: y1 + win.scrollY, w: x2 - x1, h: y2 - y1 }
  }
  const place = (box: HTMLElement, el: Element | null, label?: string) => {
    const r = el && rectOf(el)
    if (!r) { box.style.display = 'none'; return null }
    Object.assign(box.style, { display: 'block', left: r.l + 'px', top: r.t + 'px', width: r.w + 'px', height: r.h + 'px' })
    if (label !== undefined) box.innerHTML = `<b title="Agarra y arrastra para mover la casilla">${label.startsWith('🔒') ? label + ' · bloqueada' : '⠿ Mover · ' + label}</b>`
    return r
  }
  let hovP: string | null = null
  const blockAt = (p: string | null) => (p ? doc.querySelector(`.rs-b[data-bp="${p}"]`) : null)
  const label = (el: Element) => (el.hasAttribute('data-lk') ? '🔒 ' : '') + (BLOCK[el.getAttribute('data-bt') || ''] || el.getAttribute('data-bt') || '')

  const drawSel = () => {
    const p = h.sel(); const el = blockAt(p)
    const r = place(sel, el)
    if (!r || !p || !el) { bar.style.display = 'none'; return }
    const t = el.getAttribute('data-bt'); const b = getAt(h.get(), p)
    if (lockedAt(h.get(), p)) {
      bar.innerHTML = b?.locked
        ? `<span style="color:#fff;font:600 12px Inter,system-ui,sans-serif;padding:0 6px">🔒 Casilla bloqueada</span><button data-a="lock" title="Quitar el bloqueo">🔓 Desbloquear</button>`
        : `<span style="color:#fff;font:600 12px Inter,system-ui,sans-serif;padding:0 6px">🔒 Dentro de una casilla bloqueada</span>`
      bar.style.display = 'flex'; bar.style.left = Math.max(4, r.l) + 'px'; bar.style.top = Math.max(4, r.t - 42) + 'px'
      return
    }
    const kinds = t === 'chart' ? `<select id="rsK">${h.kinds.map(k => `<option value="${k}"${b?.kind === k ? ' selected' : ''}>${k}</option>`).join('')}</select>` : ''
    const vl = t === 'budget' ? [VIZ_BUD, 'donut'] : t === 'plants' ? [VIZ_PLA, 'bars'] : (t === 'ring_card' || t === 'agreement') ? [VIZ, 'ring'] : null
    const viz = vl ? `<select id="rsV" title="Cómo se dibuja">${(vl[0] as [string, string][]).map(([k, l]) => `<option value="${k}"${(b?.viz || vl[1]) === k ? ' selected' : ''}>${l}</option>`).join('')}</select>` : ''
    bar.innerHTML = `<button data-a="drag" class="rs-drag" style="touch-action:none" title="Arrastra para mover la casilla">⠿ Arrastrar</button><button data-a="up" title="Subir">↑</button><button data-a="down" title="Bajar">↓</button><button data-a="dup" title="Duplicar">⧉ Duplicar</button><button data-a="add" title="Agregar casilla debajo">＋ Debajo</button><label title="Color de fondo de la casilla">Fondo<input type="color" id="rsBg" value="${b?.bg || '#ffffff'}"></label><label title="Color del texto dentro de la casilla">Texto<input type="color" id="rsFg" value="${b?.fg || '#14243f'}"></label><button data-a="clr" title="Quitar colores de la casilla">Sin color</button><button data-a="lock" title="Bloquear: nadie la mueve, edita ni borra por accidente">🔒</button>${kinds}${viz}<button data-a="del" class="x" title="Eliminar">✕</button>`
    bar.style.display = 'flex'
    bar.style.left = Math.max(4, r.l) + 'px'; bar.style.top = Math.max(4, r.t - 42) + 'px'
  }
  const act = (a: string) => {
    const p = h.sel(); if (!p) return
    const d = h.get()
    if (a === 'lock') { h.put(setAt(d, p + '.locked', !getAt(d, p)?.locked)); h.toast(getAt(d, p)?.locked ? 'Casilla desbloqueada' : 'Casilla bloqueada 🔒'); return }
    if (lockedAt(d, p)) { h.toast('Casilla bloqueada 🔒: desbloquéala para cambiarla'); return }
    if (a === 'up') h.put(listOps.move(d, p, -1)); else if (a === 'down') h.put(listOps.move(d, p, 1))
    else if (a === 'dup') h.put(listOps.dup(d, p))
    else if (a === 'clr') h.put(setAt(setAt(d, p + '.bg', ''), p + '.fg', ''))
    else if (a === 'del') { if (win.confirm('¿Eliminar esta casilla?')) { h.put(listOps.del(d, p)); h.select(null) } }
    else if (a === 'add') { const { list, i } = parentOf(p); h.add(list, i + 1) }
    // la selección sigue al movimiento
    if (a === 'up' || a === 'down') { const { list, i } = parentOf(p); h.select(list + '.' + (i + (a === 'up' ? -1 : 1))) }
  }
  bar.addEventListener('click', e => { const b = (e.target as HTMLElement).closest('button'); if (b?.dataset.a) { e.stopPropagation(); act(b.dataset.a) } })
  bar.addEventListener('change', e => { const s = e.target as HTMLSelectElement; const p0 = h.sel(); if (p0 && (s.id === 'rsBg' || s.id === 'rsFg')) { h.put(setAt(h.get(), p0 + (s.id === 'rsBg' ? '.bg' : '.fg'), s.value)); return } if (s.id === 'rsV') { const p = h.sel(); if (p) h.put(setAt(h.get(), p + '.viz', s.value)); return } if (s.id === 'rsK') { const p = h.sel(); if (p) h.put(setAt(h.get(), p + '.kind', s.value)) } })

  doc.addEventListener('mousemove', e => {
    const t = e.target as HTMLElement; if (e.buttons || t.closest('#rsBar') || t.closest('#rsHov') || doc.querySelector('[contenteditable=true]')) return
    const el = t.closest('.rs-b'); if (!el) { hov.style.display = 'none'; return }
    hovP = el.getAttribute('data-bp'); place(hov, el, label(el))
  })
  doc.addEventListener('click', e => {
    if (Date.now() - dragEnd < 350) { e.preventDefault(); e.stopPropagation(); return }
    const t = e.target as HTMLElement
    if (t.closest('#rsBar') || t.closest('[contenteditable=true]')) return
    const ad = t.closest('.rs-add') as HTMLElement | null
    if (ad) { e.preventDefault(); const l = ad.dataset.addto!; h.add(l, (getAt(h.get(), l) || []).length); return }
    const el = t.closest('.rs-b'); if (!el) return
    if (t.closest('a')) e.preventDefault()
    h.select(el.getAttribute('data-bp'))
  }, true)
  // ── color de texto o cifra al seleccionar ──
  type Pend = { bp: string; text: string; kt: number; old: string; k: number; s0: number; e0: number; whole: boolean; segs: { t: string; c: string }[] }
  let pend: Pend | null = null
  const hideTx = () => { tx.style.display = 'none'; pend = null }
  tx.innerHTML = COLORS.map(c => `<i data-c="${c}" style="background:${c}" title="${c}"></i>`).join('') + '<input type="color" id="rsTc" title="Otro color"><button data-c="">Sin color</button>'
  const applyColor = (c: string) => {
    const p = pend; if (!p) return
    const d = h.get()
    if (p.whole) {
      const b = getAt(d, p.bp); const l = (b.tints || []).filter((x: Json) => !(x.t === p.text && x.k === p.kt)); if (c) l.push({ t: p.text, k: p.kt, c })
      h.put(setAt(d, p.bp + '.tints', l)); hideTx(); return
    }
    const out: { t: string; c: string }[] = []; let pos = 0
    for (const s of p.segs) {
      const a = pos, b2 = pos + s.t.length; pos = b2
      const i0 = Math.max(a, p.s0), i1 = Math.min(b2, p.e0)
      if (i0 >= i1) { out.push(s); continue }
      if (i0 > a) out.push({ t: s.t.slice(0, i0 - a), c: s.c })
      out.push({ t: s.t.slice(i0 - a, i1 - a), c })
      if (i1 < b2) out.push({ t: s.t.slice(i1 - a), c: s.c })
    }
    const m: { t: string; c: string }[] = []
    for (const s of out) { if (!s.t) continue; const l = m[m.length - 1]; if (l && l.c === s.c) l.t += s.t; else m.push({ ...s }) }
    const neu = m.map(s => (s.c ? `{{${s.c}|${s.t}}}` : s.t)).join('')
    const r = applyText(d, p.bp, p.old, p.k, neu)
    if (r) { h.put(r); hideTx() } else h.toast('Ese texto se calcula o viene de otro dato; edítalo en el panel')
  }
  tx.addEventListener('mousedown', e => { if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault() })
  tx.addEventListener('click', e => { const c = (e.target as HTMLElement).closest('[data-c]') as HTMLElement | null; if (c) applyColor(c.dataset.c!) })
  tx.addEventListener('change', e => { const i = e.target as HTMLInputElement; if (i.id === 'rsTc') applyColor(i.value) })
  doc.addEventListener('mousedown', e => { if (!(e.target as HTMLElement).closest('#rsTx')) hideTx() })
  doc.addEventListener('mouseup', e => {
    if ((e.target as HTMLElement).closest('#rsTx,#rsBar')) return
    setTimeout(() => {
      const s = win.getSelection(); if (!s || s.isCollapsed || !s.rangeCount) return
      const r = s.getRangeAt(0)
      const n = r.commonAncestorContainer; let el = (n.nodeType === 3 ? n.parentElement : n) as HTMLElement | null
      if (!el || el.closest('[contenteditable=true],svg,.rs-chart,#rsBar,#rsTx')) return
      const blk = el.closest('.rs-b') as HTMLElement | null; if (!blk || lockedAt(h.get(), blk.getAttribute('data-bp'))) return
      while (el !== blk && el.parentElement && el.parentElement !== blk && !el.hasAttribute('data-to') && (/^(B|I|STRONG|EM)$/.test(el.tagName) || el.hasAttribute('data-rc'))) el = el.parentElement
      if (el === blk || !isLeaf(el)) { if (el === blk || el.querySelector('div,p,li,table,figure,h3,h4,ul')) return }
      const text = (el.textContent || '').trim(); if (!text) return
      const whole = r.toString().trim() === text || el.hasAttribute('data-to') || /^[\d.,\s%$]+$/.test(text) || !!el.querySelector('br')
      const segs: { t: string; c: string }[] = []
      const walk = (x: Node, c: string) => x.childNodes.forEach(m => { if (m.nodeType === 3) segs.push({ t: m.nodeValue || '', c }); else if ((m as HTMLElement).hasAttribute?.('data-rc')) walk(m, (m as HTMLElement).getAttribute('data-rc')!); else walk(m, c) })
      walk(el, '')
      const r0 = doc.createRange(); r0.selectNodeContents(el); r0.setEnd(r.startContainer, r.startOffset)
      const r1 = doc.createRange(); r1.selectNodeContents(el); r1.setEnd(r.endContainer, r.endOffset)
      const old = ser(el)
      const same = Array.from(blk.querySelectorAll('*')).filter(x => isLeaf(x) && ser(x) === old)
      const sameT = Array.from(blk.querySelectorAll('*')).filter(x => isLeaf(x) && (x.textContent || '').trim() === text)
      pend = { bp: blk.getAttribute('data-bp')!, text, kt: Math.max(0, sameT.indexOf(el)), old, k: Math.max(0, same.indexOf(el)), s0: r0.toString().length, e0: r1.toString().length, whole, segs }
      const rc = r.getBoundingClientRect()
      tx.style.display = 'flex'
      tx.style.left = Math.max(4, rc.left + win.scrollX) + 'px'; tx.style.top = Math.max(4, rc.top + win.scrollY - 44) + 'px'
    }, 280)
  })
  doc.addEventListener('dblclick', e => {
    hideTx()
    const t = e.target as HTMLElement
    if (t.closest('svg') || t.closest('.rs-chart') || t.closest('#rsBar')) { if (t.closest('.rs-chart')) h.toast('Los datos del gráfico se editan en el panel de la derecha'); return }
    const blk = t.closest('.rs-b'); if (!blk || !t.textContent?.trim()) return
    if (lockedAt(h.get(), blk.getAttribute('data-bp'))) { h.toast('Casilla bloqueada 🔒: desbloquéala para editarla'); return }
    const fx = t.closest('[data-tx]') as HTMLElement | null
    let el: HTMLElement = fx || t
    if (fx) {
      const key = fx.dataset.tx!, old0 = fx.textContent || ''
      fx.contentEditable = 'true'; fx.focus(); win.getSelection()?.selectAllChildren(fx)
      const fin = (ok: boolean) => {
        fx.removeEventListener('blur', ob); fx.removeEventListener('keydown', ok2); fx.contentEditable = 'false'; fx.removeAttribute('contenteditable')
        let neu = (fx.innerText || fx.textContent || '').replace(/\n+$/, '')
        if (old0.startsWith(' ') && !neu.startsWith(' ')) neu = ' ' + neu
        if (!ok || neu === old0) { fx.textContent = old0; return }
        const d0 = h.get(); h.put({ ...d0, meta: { ...d0.meta, texts: { ...(d0.meta.texts || {}), [key]: neu } } })
      }
      const ob = () => fin(true)
      const ok2 = (ev: KeyboardEvent) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); fx.blur() } else if (ev.key === 'Escape') { ev.preventDefault(); fin(false) } }
      fx.addEventListener('blur', ob); fx.addEventListener('keydown', ok2)
      return
    }
    while (el !== blk && el.parentElement && el.parentElement !== blk && (/^(B|I|STRONG|EM)$/.test(el.tagName) || el.hasAttribute('data-rc')) && !/^(DIV|TD|TH)$/.test(el.parentElement.tagName)) el = el.parentElement
    if (el.querySelector('div,p,li,table,figure,h3')) { h.toast('Haz doble clic directamente sobre el texto'); return }
    const old = ser(el)
    const same = Array.from(blk.querySelectorAll('*')).filter(x => isLeaf(x) && ser(x) === old)
    const k = Math.max(0, same.indexOf(el))
    el.contentEditable = 'true'; el.focus()
    win.getSelection()?.selectAllChildren(el)
    const done = (ok: boolean) => {
      el.removeEventListener('blur', onBlur); el.removeEventListener('keydown', onKey); el.contentEditable = 'false'; el.removeAttribute('contenteditable')
      const neu = (el.querySelector('[data-rc]') ? ser(el) : (el.innerText || el.textContent || '')).replace(/\n+$/, '')
      if (!ok || neu === old) { el.textContent = old; return }
      const r = applyText(h.get(), blk.getAttribute('data-bp')!, old, k, neu)
      if (r) h.put(r); else { el.textContent = old; h.toast('Ese texto se calcula o viene de otro dato; edítalo en el panel') }
    }
    const onBlur = () => done(true)
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); el.blur() } else if (ev.key === 'Escape') { ev.preventDefault(); done(false) } }
    el.addEventListener('blur', onBlur); el.addEventListener('keydown', onKey)
  })
  // ── arrastrar casillas (eventos de puntero: ratón y táctil, con fantasma, guía y desplazamiento automático) ──
  type Drop = { kind: 'block'; to: string; after: boolean; side: boolean } | { kind: 'tab'; id: string; el: HTMLElement } | { kind: 'list'; list: string; el: HTMLElement }
  const ghost = mk('rsGhost')
  let dragP: string | null = null, dropAt: Drop | null = null, last = { x: 0, y: 0 }, raf = 0, dragEnd = 0
  const clearMarks = () => doc.querySelectorAll('.rs-tabdrop').forEach(x => x.classList.remove('rs-tabdrop'))
  const stopDrag = () => {
    dragP = null; dropAt = null; dragEnd = Date.now(); cancelAnimationFrame(raf)
    drop.style.display = 'none'; ghost.style.display = 'none'; clearMarks()
    doc.body.classList.remove('rs-dragmode')
    doc.querySelectorAll('.rs-dragging').forEach(x => x.classList.remove('rs-dragging'))
    doc.removeEventListener('pointermove', onMove, true); doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('pointercancel', onCancel, true); doc.removeEventListener('keydown', onEsc, true)
  }
  const hint = (t: string, tone = '') => { drop.innerHTML = `<em>${t}</em>`; drop.dataset.tone = tone }
  const resolve = () => {
    if (!dragP) return
    const { x, y } = last
    const tgt = doc.elementFromPoint(x, y) as HTMLElement | null
    clearMarks(); drop.style.display = 'none'; dropAt = null
    if (!tgt) return
    const tab = tgt.closest('.tab') as HTMLElement | null
    if (tab) { tab.classList.add('rs-tabdrop'); dropAt = { kind: 'tab', id: tab.getAttribute('data-t') || '', el: tab }; return }
    const ad = tgt.closest('.rs-add') as HTMLElement | null
    if (ad && ad.dataset.addto) { ad.classList.add('rs-tabdrop'); dropAt = { kind: 'list', list: ad.dataset.addto, el: ad }; return }
    const el = tgt.closest('.rs-b') as HTMLElement | null
    if (!el) return
    const to = el.getAttribute('data-bp')!
    if (to === dragP || to.startsWith(dragP + '.')) return
    const r = rectOf(el); if (!r) return
    const cx = x + win.scrollX, cy = y + win.scrollY
    const tspan = getAt(h.get(), to)?.span || 'full'
    const fx = (cx - r.l) / r.w
    let side: boolean, after: boolean
    if (tspan !== 'full') { side = true; after = fx > 0.5 }
    else if (fx < 0.25 || fx > 0.75) { side = true; after = fx > 0.5 }
    else { side = false; after = cy > r.t + r.h / 2 }
    dropAt = { kind: 'block', to, after, side }
    hint(side ? (after ? 'Al lado ▶' : '◀ Al lado') : (after ? 'Debajo' : 'Arriba'))
    Object.assign(drop.style, side
      ? { display: 'block', top: r.t + 'px', height: r.h + 'px', left: (after ? r.l + r.w + 2 : r.l - 8) + 'px', width: '7px' }
      : { display: 'block', left: r.l + 'px', width: r.w + 'px', top: (after ? r.t + r.h + 2 : r.t - 8) + 'px', height: '7px' })
  }
  const loop = () => {
    if (!dragP) return
    const m = 110, H = win.innerHeight
    if (last.y < m) win.scrollBy(0, -Math.ceil((m - last.y) / 3)); else if (last.y > H - m) win.scrollBy(0, Math.ceil((last.y - (H - m)) / 3))
    resolve(); raf = requestAnimationFrame(loop)
  }
  const onMove = (e: PointerEvent) => { e.preventDefault(); last = { x: e.clientX, y: e.clientY }; ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px' }
  const onCancel = () => stopDrag()
  const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') stopDrag() }
  const onUp = (e: PointerEvent) => {
    e.preventDefault(); last = { x: e.clientX, y: e.clientY }; resolve()
    const from = dragP, at = dropAt; stopDrag()
    if (from && at) applyDrop(from, at)
  }
  const startDrag = (p: string, e: PointerEvent) => {
    if (lockedAt(h.get(), p)) { h.toast('Casilla bloqueada 🔒: desbloquéala para moverla'); return }
    dragP = p; last = { x: e.clientX, y: e.clientY }
    const el = blockAt(p); el?.classList.add('rs-dragging')
    ghost.textContent = '⠿ ' + (el ? label(el) : 'Casilla'); ghost.style.display = 'block'
    ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'
    hov.style.display = 'none'; win.getSelection()?.removeAllRanges()
    doc.body.classList.add('rs-dragmode')
    doc.addEventListener('pointermove', onMove, true); doc.addEventListener('pointerup', onUp, true)
    doc.addEventListener('pointercancel', onCancel, true); doc.addEventListener('keydown', onEsc, true)
    raf = requestAnimationFrame(loop)
  }
  const applyDrop = (from: string, at: Drop) => {
    const d0 = h.get(); const sp = parentOf(from)
    const tgtPath = at.kind === 'block' ? parentOf(at.to).list : at.kind === 'list' ? at.list : ''
    if (tgtPath && lockedAt(d0, tgtPath)) { h.toast('Esa casilla está bloqueada: no se puede soltar dentro'); return }
    if (at.kind === 'tab' || at.kind === 'list') {
      let tl: string, name = ''
      if (at.kind === 'tab') {
        const si = (d0.sections || []).findIndex((x: Json) => x.id === at.id)
        if (si < 0) { h.toast('Esa pestaña no es una sección editable'); return }
        tl = `sections.${si}.blocks`; name = d0.sections[si].label || d0.sections[si].title || at.id
      } else tl = at.list
      if (tl === from || tl.startsWith(from + '.') || tl.startsWith(sp.list + '.')) { h.toast('No se puede soltar ahí'); return }
      const item = { ...getAt(d0, from), span: 'full' }
      const d1 = setAt(d0, sp.list, getAt(d0, sp.list).filter((_: Json, k: number) => k !== sp.i))
      const dst = [...(getAt(d1, tl) || []), item]
      if (at.kind === 'tab') { dragEnd = 0; at.el.click() }
      h.put(setAt(d1, tl, dst)); h.select(tl + '.' + (dst.length - 1))
      if (name) h.toast('Movida a «' + name + '»')
      return
    }
    const tt = getAt(d0, at.to)
    const r = listOps.moveTo(d0, from, at.to, at.after)
    if (!r) { h.toast('No se puede soltar ahí'); return }
    let d = r.d
    if (at.side) {
      const w = (tt?.span && tt.span !== 'full') ? tt.span : '1/2'
      d = setAt(d, r.path + '.span', w)
      if (!tt?.span || tt.span === 'full') { const q = parentOf(r.path); d = setAt(d, q.list + '.' + (at.after ? q.i - 1 : q.i + 1) + '.span', w) }
    } else d = setAt(d, r.path + '.span', 'full')
    h.put(d); h.select(r.path)
  }
  // agarrar: etiqueta «Mover» (aparece dentro de la casilla), botón de la barra, o mantener pulsado ~½ s sobre cualquier casilla
  hov.addEventListener('pointerdown', e => { const b = (e.target as HTMLElement).closest('b'); if (!b || !hovP) return; e.preventDefault(); e.stopPropagation(); startDrag(hovP, e) })
  bar.addEventListener('pointerdown', e => { const b = (e.target as HTMLElement).closest('button[data-a="drag"]'); const p = h.sel(); if (!b || !p) return; e.preventDefault(); startDrag(p, e) })
  doc.addEventListener('pointerdown', e => {
    if (e.button !== 0 || dragP || e.pointerType === 'touch') return
    const t = e.target as HTMLElement
    if (t.closest('#rsBar,#rsTx,#rsHov,[contenteditable=true],input,select,textarea,.rs-add,a,button,.tab,svg')) return
    const el = t.closest('.rs-b'); if (!el) return
    const p = el.getAttribute('data-bp')!, x0 = e.clientX, y0 = e.clientY
    const end = () => { clearTimeout(timer); doc.removeEventListener('pointermove', mv, true); doc.removeEventListener('pointerup', end, true) }
    const mv = (ev: PointerEvent) => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) end() }
    const timer = setTimeout(() => { end(); startDrag(p, e) }, 480)
    doc.addEventListener('pointermove', mv, true); doc.addEventListener('pointerup', end, true)
  }, true)
  win.addEventListener('resize', drawSel)
  const redraw = () => drawSel()
  ;(doc as any).__rsRedraw = redraw
  setTimeout(redraw, 700); setTimeout(redraw, 1800)
}
