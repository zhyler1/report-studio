export type Json = Record<string, any>
export type ReportRow = { id: number; title: string; updated: string; version: number }
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
  create: (data: Json, note = '') => req('/api/reports', J({ data, note })).then(r => r.json()),
  save: (id: number, data: Json, note: string) => req(`/api/reports/${id}`, { ...J({ data, note }), method: 'PUT' }).then(r => r.json()),
  remove: (id: number) => req(`/api/reports/${id}`, { method: 'DELETE' }),
  versions: (id: number): Promise<Version[]> => req(`/api/reports/${id}/versions`).then(r => r.json()),
  restore: (id: number, n: number) => req(`/api/reports/${id}/versions/${n}/restore`, { method: 'POST' }).then(r => r.json()),
  validate: (data: Json): Promise<{ ok: boolean; issues: string[] }> => req('/api/validate', J(data)).then(r => r.json()),
  render: (data: Json): Promise<string> => req('/api/render', J(data)).then(r => r.text()),
}
