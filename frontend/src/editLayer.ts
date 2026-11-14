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

export const listOps = {
  move(d: Json, p: string, dx: number): Json {
    const { list, i } = parentOf(p); const a = [...getAt(d, list)]; const j = i + dx
    if (j < 0 || j >= a.length) return d
    ;[a[i], a[j]] = [a[j], a[i]]; return setAt(d, list, a)
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

const CSS = `
.rs-add{margin:14px 0;padding:18px;border:2px dashed #9db4d8;border-radius:14px;text-align:center;color:#2160b0;font:600 14px Inter,system-ui,sans-serif;cursor:pointer;background:rgba(33,96,176,.04)}
.rs-add:hover{background:rgba(33,96,176,.12)}
#rsHov,#rsSel{position:absolute;pointer-events:none;border-radius:10px;z-index:99990;display:none}
#rsHov{outline:2px dashed #2160b0;outline-offset:2px}#rsSel{outline:3px solid #E8711A;outline-offset:2px}
#rsHov b{position:absolute;top:-22px;left:0;background:#2160b0;color:#fff;font:600 11px Inter,system-ui,sans-serif;padding:2px 8px;border-radius:6px 6px 0 0;white-space:nowrap}
#rsBar{position:absolute;z-index:99999;display:none;gap:4px;background:#0f1b33;padding:5px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.35);align-items:center}
#rsBar button,#rsBar select{font:600 12px Inter,system-ui,sans-serif;border:0;border-radius:6px;padding:5px 8px;background:#26385c;color:#fff;cursor:pointer}
#rsBar button:hover{background:#3a5288}#rsBar .x{background:#a82a2a}
[contenteditable=true]{outline:2px solid #E8711A!important;outline-offset:3px;background:rgba(232,113,26,.08);cursor:text}
.rs-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0f1b33;color:#fff;padding:10px 16px;border-radius:10px;font:600 13px Inter,system-ui,sans-serif;z-index:99999}
`

export function attach(doc: Document, h: Host) {
  if (!doc.body || doc.getElementById('rsBar')) return
  const st = doc.createElement('style'); st.textContent = CSS; doc.head.appendChild(st)
  const mk = (id: string) => { const e = doc.createElement('div'); e.id = id; doc.body.appendChild(e); return e }
  const hov = mk('rsHov'), sel = mk('rsSel'), bar = mk('rsBar')
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
    if (label !== undefined) box.innerHTML = `<b>${label}</b>`
    return r
  }
  const blockAt = (p: string | null) => (p ? doc.querySelector(`.rs-b[data-bp="${p}"]`) : null)
  const label = (el: Element) => BLOCK[el.getAttribute('data-bt') || ''] || el.getAttribute('data-bt') || ''

  const drawSel = () => {
    const p = h.sel(); const el = blockAt(p)
    const r = place(sel, el)
    if (!r || !p || !el) { bar.style.display = 'none'; return }
    const t = el.getAttribute('data-bt'); const b = getAt(h.get(), p)
    const kinds = t === 'chart' ? `<select id="rsK">${h.kinds.map(k => `<option value="${k}"${b?.kind === k ? ' selected' : ''}>${k}</option>`).join('')}</select>` : ''
    bar.innerHTML = `<button data-a="up" title="Subir">↑</button><button data-a="down" title="Bajar">↓</button><button data-a="dup" title="Duplicar">⧉ Duplicar</button><button data-a="add" title="Agregar casilla debajo">＋ Debajo</button>${kinds}<button data-a="del" class="x" title="Eliminar">✕</button>`
    bar.style.display = 'flex'
    bar.style.left = Math.max(4, r.l) + 'px'; bar.style.top = Math.max(4, r.t - 42) + 'px'
  }
  const act = (a: string) => {
    const p = h.sel(); if (!p) return
    const d = h.get()
    if (a === 'up') h.put(listOps.move(d, p, -1)); else if (a === 'down') h.put(listOps.move(d, p, 1))
    else if (a === 'dup') h.put(listOps.dup(d, p))
    else if (a === 'del') { if (win.confirm('¿Eliminar esta casilla?')) { h.put(listOps.del(d, p)); h.select(null) } }
    else if (a === 'add') { const { list, i } = parentOf(p); h.add(list, i + 1) }
    // la selección sigue al movimiento
    if (a === 'up' || a === 'down') { const { list, i } = parentOf(p); h.select(list + '.' + (i + (a === 'up' ? -1 : 1))) }
  }
  bar.addEventListener('click', e => { const b = (e.target as HTMLElement).closest('button'); if (b?.dataset.a) { e.stopPropagation(); act(b.dataset.a) } })
  bar.addEventListener('change', e => { const s = e.target as HTMLSelectElement; if (s.id === 'rsK') { const p = h.sel(); if (p) h.put(setAt(h.get(), p + '.kind', s.value)) } })

  doc.addEventListener('mousemove', e => {
    const t = e.target as HTMLElement; if (t.closest('#rsBar') || doc.querySelector('[contenteditable=true]')) return
    const el = t.closest('.rs-b'); if (!el) { hov.style.display = 'none'; return }
    place(hov, el, label(el))
  })
  doc.addEventListener('click', e => {
    const t = e.target as HTMLElement
    if (t.closest('#rsBar') || t.closest('[contenteditable=true]')) return
    const ad = t.closest('.rs-add') as HTMLElement | null
    if (ad) { e.preventDefault(); const l = ad.dataset.addto!; h.add(l, (getAt(h.get(), l) || []).length); return }
    const el = t.closest('.rs-b'); if (!el) return
    if (t.closest('a')) e.preventDefault()
    h.select(el.getAttribute('data-bp'))
  }, true)
  doc.addEventListener('dblclick', e => {
    const t = e.target as HTMLElement
    if (t.closest('svg') || t.closest('.rs-chart') || t.closest('#rsBar')) { if (t.closest('.rs-chart')) h.toast('Los datos del gráfico se editan en el panel de la derecha'); return }
    const blk = t.closest('.rs-b'); if (!blk || !t.textContent?.trim()) return
    let el: HTMLElement = t
    while (el !== blk && el.parentElement && el.parentElement !== blk && /^(B|I|STRONG|EM)$/.test(el.tagName) && !/^(DIV|TD|TH)$/.test(el.parentElement.tagName)) el = el.parentElement
    if (el.querySelector('div,p,li,table,figure,h3')) { h.toast('Haz doble clic directamente sobre el texto'); return }
    const old = el.textContent || ''
    const same = Array.from(blk.querySelectorAll('*')).filter(x => x.textContent === old && !x.querySelector('*:not(b):not(br)'))
    const k = Math.max(0, same.indexOf(el))
    el.contentEditable = 'true'; el.focus()
    win.getSelection()?.selectAllChildren(el)
    const done = (ok: boolean) => {
      el.removeEventListener('blur', onBlur); el.removeEventListener('keydown', onKey); el.contentEditable = 'false'; el.removeAttribute('contenteditable')
      const neu = (el.innerText || el.textContent || '').replace(/\n+$/, '')
      if (!ok || neu === old) { el.textContent = old; return }
      const r = applyText(h.get(), blk.getAttribute('data-bp')!, old, k, neu)
      if (r) h.put(r); else { el.textContent = old; h.toast('Ese texto se calcula o viene de otro dato; edítalo en el panel') }
    }
    const onBlur = () => done(true)
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); el.blur() } else if (ev.key === 'Escape') { ev.preventDefault(); done(false) } }
    el.addEventListener('blur', onBlur); el.addEventListener('keydown', onKey)
  })
  win.addEventListener('resize', drawSel)
  const redraw = () => drawSel()
  ;(doc as any).__rsRedraw = redraw
  setTimeout(redraw, 700); setTimeout(redraw, 1800)
}
