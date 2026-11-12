// Cuenta (usuario protegido) y copia en la nube del Worker (D1).
// Spec: docs/superpowers/specs/2026-10-14-migracion-hosting-cloudflare-design.md
import { writable } from 'svelte/store'
import { PUSH_SERVER_URL } from '$lib/config'
import { getAll, get, put } from '$lib/db'
import { backupAll, getSettings } from '$lib/storage'

export const MIN_PASSWORD = 8
const UPLOAD_BATCH = 500
const ACCOUNT_KEY = 'cloud-account'
const HASHES_KEY = 'cloud-hashes'
const UPLOAD_KEY = 'cloud-upload'
const LIST_STORES = ['exercises', 'exerciseLogs', 'programs', 'gymSessions'] as const
// Belong to this phone, not to the person: never uploaded, never overwritten.
const DEVICE_FIELDS = ['pushSubscribed', 'pushServerUrl', 'sessionState'] as const

export interface CloudAccount { username: string; email: string; token: string }
export interface UploadStatus { lastAt: string | null; pending: boolean }
export interface CloudRecord { store: string; id: string; data: any }
export interface CloudDelete { store: string; id: string }
export type AuthResult =
  | { ok: true }
  | { ok: false; reason: 'protected' | 'wrong' | 'invalid' | 'network'; message?: string }
export type UploadResult = 'saved' | 'pending' | 'signed-out' | 'skipped'

// ── localStorage ──

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export function getAccount(): CloudAccount | null {
  const a = readJSON<CloudAccount | null>(ACCOUNT_KEY, null)
  return a && a.token && a.username ? a : null
}

export function saveAccount(account: CloudAccount): void {
  writeJSON(ACCOUNT_KEY, account)
  refreshCloudState()
}

/** The token stopped working (Pedro deleted the account): back to "no account". */
export function clearAccount(): void {
  try {
    localStorage.removeItem(ACCOUNT_KEY)
    localStorage.removeItem(HASHES_KEY)
    localStorage.removeItem(UPLOAD_KEY)
  } catch {}
  refreshCloudState()
}

export function getUploadStatus(): UploadStatus {
  return readJSON<UploadStatus>(UPLOAD_KEY, { lastAt: null, pending: false })
}

function setUploadStatus(status: UploadStatus): void {
  writeJSON(UPLOAD_KEY, status)
  refreshCloudState()
}

function markPending(): void {
  setUploadStatus({ ...getUploadStatus(), pending: true })
}

function getHashes(): Record<string, string> {
  return readJSON<Record<string, string>>(HASHES_KEY, {})
}

function saveHashes(hashes: Record<string, string>): void {
  writeJSON(HASHES_KEY, hashes)
}

// ── Reactive state for Tú ──

export const cloudState = writable<{ account: CloudAccount | null; status: UploadStatus }>({
  account: null,
  status: { lastAt: null, pending: false },
})

export function refreshCloudState(): void {
  cloudState.set({ account: getAccount(), status: getUploadStatus() })
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** «Guardado hoy 18:42» · «Guardado el 12 oct» · «Pendiente de subir» */
export function uploadStatusLabel(status: UploadStatus, now = new Date()): string {
  if (status.pending || !status.lastAt) return 'Pendiente de subir'
  const at = new Date(status.lastAt)
  if (sameDay(at, now)) {
    const hh = String(at.getHours()).padStart(2, '0')
    const mm = String(at.getMinutes()).padStart(2, '0')
    return `Guardado hoy ${hh}:${mm}`
  }
  return `Guardado el ${at.getDate()} ${MONTHS[at.getMonth()]}`
}

// ── Validation ──

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test((email || '').trim())
}

// ── Worker calls ──

async function callWorker(path: string, init: RequestInit = {}, token?: string): Promise<Response | null> {
  if (!PUSH_SERVER_URL) return null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    return await fetch(`${PUSH_SERVER_URL}${path}`, { ...init, headers })
  } catch {
    return null
  }
}

async function errorMessage(res: Response): Promise<string | undefined> {
  try { return (await res.json()).error } catch { return undefined }
}

/** Authorization header for calls that need the account (rename). */
export function authHeader(): Record<string, string> {
  const a = getAccount()
  return a ? { Authorization: `Bearer ${a.token}` } : {}
}

export async function createAccount(username: string, email: string, password: string): Promise<AuthResult> {
  const res = await callWorker('/api/account/create', { method: 'POST', body: JSON.stringify({ username, email: email.trim(), password }) })
  if (!res) return { ok: false, reason: 'network' }
  if (res.status === 409) return { ok: false, reason: 'protected' }
  if (!res.ok) return { ok: false, reason: res.status === 400 ? 'invalid' : 'network', message: await errorMessage(res) }
  const { token } = await res.json()
  saveAccount({ username, email: email.trim(), token })
  return { ok: true }
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const res = await callWorker('/api/account/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  if (!res) return { ok: false, reason: 'network' }
  if (res.status === 401) return { ok: false, reason: 'wrong' }
  if (!res.ok) return { ok: false, reason: 'network' }
  const { token, email } = await res.json()
  saveAccount({ username, email: email || '', token })
  return { ok: true }
}

// ── Snapshot & diff ──

function recordKey(store: string, id: string): string {
  return `${store}:${id}`
}

function withoutDeviceFields(settings: Record<string, any>): Record<string, any> {
  const copy = { ...settings }
  for (const f of DEVICE_FIELDS) delete copy[f]
  return copy
}

/** FNV-1a 32-bit of the record's JSON: enough to tell "changed" from "same". */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function hashRecord(r: CloudRecord): string {
  return fnv1a(JSON.stringify(r.data))
}

/** Same shape as exportLogsAndSettings, flattened to one record per IndexedDB row. */
export async function buildSnapshot(): Promise<CloudRecord[]> {
  const records: CloudRecord[] = []
  for (const store of LIST_STORES) {
    for (const item of await getAll<any>(store)) records.push({ store, id: String(item.id), data: item })
  }
  const settings = await get<any>('settings', 'settings')
  if (settings) records.push({ store: 'settings', id: 'settings', data: withoutDeviceFields(settings) })
  return records
}

export function diffSnapshot(snapshot: CloudRecord[], hashes: Record<string, string>): { upserts: CloudRecord[]; deletes: CloudDelete[] } {
  const present = new Set<string>()
  const upserts: CloudRecord[] = []
  for (const r of snapshot) {
    const key = recordKey(r.store, r.id)
    present.add(key)
    if (hashes[key] !== hashRecord(r)) upserts.push(r)
  }
  const deletes = Object.keys(hashes)
    .filter(key => !present.has(key))
    .map(key => ({ store: key.slice(0, key.indexOf(':')), id: key.slice(key.indexOf(':') + 1) }))
  return { upserts, deletes }
}

type Op = { kind: 'upsert'; r: CloudRecord } | { kind: 'delete'; r: CloudDelete }

function toBatches(upserts: CloudRecord[], deletes: CloudDelete[]): Op[][] {
  const ops: Op[] = [
    ...upserts.map(r => ({ kind: 'upsert' as const, r })),
    ...deletes.map(r => ({ kind: 'delete' as const, r })),
  ]
  // Nothing changed still sends one empty batch: the cloud stamps "saved now".
  if (!ops.length) return [[]]
  const batches: Op[][] = []
  for (let i = 0; i < ops.length; i += UPLOAD_BATCH) batches.push(ops.slice(i, i + UPLOAD_BATCH))
  return batches
}

function applyBatchToHashes(hashes: Record<string, string>, batch: Op[]): void {
  for (const op of batch) {
    const key = recordKey(op.r.store, op.r.id)
    if (op.kind === 'upsert') hashes[key] = hashRecord(op.r as CloudRecord)
    else delete hashes[key]
  }
}

async function sendBatch(token: string, batch: Op[]): Promise<Response | null> {
  const body = {
    upserts: batch.filter(o => o.kind === 'upsert').map(o => o.r),
    deletes: batch.filter(o => o.kind === 'delete').map(o => ({ store: o.r.store, id: o.r.id })),
  }
  return callWorker('/api/cloud/upload', { method: 'POST', body: JSON.stringify(body) }, token)
}

// ── Upload ──

let uploading: Promise<UploadResult> | null = null

/** Sends only what changed since the last accepted upload. Never throws. */
export function uploadSnapshot(): Promise<UploadResult> {
  if (!uploading) uploading = runUpload().finally(() => { uploading = null })
  return uploading
}

async function runUpload(): Promise<UploadResult> {
  const account = getAccount()
  if (!account || !PUSH_SERVER_URL) return 'skipped'
  try {
    const hashes = getHashes()
    const { upserts, deletes } = diffSnapshot(await buildSnapshot(), hashes)
    let lastAt = new Date().toISOString()
    for (const batch of toBatches(upserts, deletes)) {
      const res = await sendBatch(account.token, batch)
      if (res && res.status === 401) { clearAccount(); return 'signed-out' }
      if (!res || !res.ok) { markPending(); return 'pending' }
      lastAt = (await res.json().catch(() => ({}))).uploadedAt || lastAt
      applyBatchToHashes(hashes, batch)
      saveHashes(hashes)
    }
    setUploadStatus({ lastAt, pending: false })
    return 'saved'
  } catch {
    markPending()
    return 'pending'
  }
}

export async function retryPendingUpload(): Promise<UploadResult> {
  if (!getAccount() || !getUploadStatus().pending) return 'skipped'
  return uploadSnapshot()
}

// ── Download ──

async function fetchAllRecords(token: string): Promise<CloudRecord[]> {
  const all: CloudRecord[] = []
  let after: string | null = null
  do {
    const query: string = after ? `?after=${encodeURIComponent(after)}` : ''
    const res = await callWorker(`/api/cloud/download${query}`, { method: 'GET' }, token)
    if (res && res.status === 401) { clearAccount(); throw new Error('signed-out') }
    if (!res || !res.ok) throw new Error('network')
    const page: { records: CloudRecord[]; next: string | null } = await res.json()
    all.push(...page.records)
    after = page.next
  } while (after)
  return all
}

/** Cloud settings, keeping this phone's own push/session fields. */
async function mergeSettings(cloud: Record<string, any>): Promise<Record<string, any>> {
  const local: Record<string, any> = await getSettings()
  const merged: Record<string, any> = { ...withoutDeviceFields(cloud), id: 'settings' }
  for (const f of DEVICE_FIELDS) merged[f] = local[f] ?? null
  return merged
}

/** Adds the cloud copy to this phone, like restoring a backup (never deletes). */
export async function downloadAll(): Promise<number> {
  const account = getAccount()
  if (!account || !PUSH_SERVER_URL) return 0
  const records = await fetchAllRecords(account.token)
  const hashes = getHashes()
  for (const r of records) {
    const data = r.store === 'settings' ? await mergeSettings(r.data) : r.data
    await put(r.store, data)
    hashes[recordKey(r.store, r.id)] = hashRecord(r)
  }
  saveHashes(hashes)
  setUploadStatus({ lastAt: getUploadStatus().lastAt || new Date().toISOString(), pending: false })
  await backupAll()
  return records.length
}
