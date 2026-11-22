export type Json = Record<string, any>
export type ReportRow = { id: number; title: string; updated: string; version: number }
export type Tpl = { id: string; name: string; desc?: string; cat?: string; builtin: boolean; section: Json }
export type Version = { n: number; created: string; note: string }

async function req(url: string, init?: RequestInit) {
  const r = await fetch(url, init)
  if (!r.ok) {
    let d: any = null
    try { d = await r.json() } catch { /* sin cuerpo */ }
    const e: any = new Error(d?.detail?.message || d?.detail || r.statusText)
    e.issues = d?.detail?.issues || []
    throw e
  }
  return r
}
const J = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

export const api = {
  list: (): Promise<ReportRow[]> => req('/api/reports').then(r => r.json()),
  get: (id: number): Promise<{ id: number; title: string; version: number; data: Json }> => req(`/api/reports/${id}`).then(r => r.json()),
  fromStarter: (id: string) => req('/api/reports/from-starter/' + id, { method: 'POST' }).then(r => r.json()),
  importFile: (f: File) => { const fd = new FormData(); fd.append('file', f); return fetch('/api/reports/import', { method: 'POST', body: fd }).then(async r => { if (!r.ok) { const j = await r.json().catch(() => ({})); throw { message: j.detail?.toString() || 'No se pudo importar', issues: j.issues } } return r.json() }) },
  create: (data: Json, note = '') => req('/api/reports', J({ data, note })).then(r => r.json()),
  save: (id: number, data: Json, note: string) => req(`/api/reports/${id}`, { ...J({ data, note }), method: 'PUT' }).then(r => r.json()),
  rename: (id: number, name: string) => req(`/api/reports/${id}/name`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }).then(r => r.json()),
  remove: (id: number) => req(`/api/reports/${id}`, { method: 'DELETE' }),
  versions: (id: number): Promise<Version[]> => req(`/api/reports/${id}/versions`).then(r => r.json()),
  restore: (id: number, n: number) => req(`/api/reports/${id}/versions/${n}/restore`, { method: 'POST' }).then(r => r.json()),
  validate: (data: Json): Promise<{ ok: boolean; issues: string[] }> => req('/api/validate', J(data)).then(r => r.json()),
  schema: (): Promise<Json> => req('/api/schema').then(r => r.json()),
  fromUrl: (url: string): Promise<{ url: string }> => req('/api/media/url', J({ url })).then(r => r.json()),
  upload: (f: File): Promise<{ url: string }> => { const fd = new FormData(); fd.append('file', f); return req('/api/media', { method: 'POST', body: fd }).then(r => r.json()) },
  texts: (): Promise<{ key: string; default: string; group: string }[]> => req('/api/texts').then(r => r.json()),
  ingestStatus: (): Promise<{ engine: string | null }> => req('/api/ingest/status').then(r => r.json()),
  extract: (f: File): Promise<{ name: string; text: string; report: Json | null }> => { const fd = new FormData(); fd.append('file', f); return req('/api/ingest/extract', { method: 'POST', body: fd }).then(r => r.json()) },
  propose: (text: string, hint: string, section = ''): Promise<{ engine: string | null; blocks: Json[]; issues: string[] }> => req('/api/ingest/propose', J({ text, hint, section })).then(r => r.json()),
  templates: (): Promise<Tpl[]> => req('/api/templates').then(r => r.json()),
  addTemplate: (name: string, section: Json) => req('/api/templates', J({ name, section })).then(r => r.json()),
  delTemplate: (id: string) => req('/api/templates/' + id.split(':')[1], { method: 'DELETE' }),
  render: (data: Json, edit = false): Promise<string> => req('/api/render' + (edit ? '?edit=1' : ''), J(data)).then(r => r.text()),
}
