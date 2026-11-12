// Cuentas (usuario protegido con correo + contraseña) y copia en la nube, en D1.
// Spec: docs/superpowers/specs/2026-10-14-migracion-hosting-cloudflare-design.md

// Workers caps PBKDF2 at 100000. If `wrangler tail` shows "exceeded CPU" on
// create/login, lower it (and every existing hash stops matching — only do it
// before people have accounts).
export const PBKDF2_ITERATIONS = 100000
export const MIN_PASSWORD = 8
export const MAX_BATCH = 500
export const PAGE_SIZE = 1000
export const CLOUD_STORES = ['exercises', 'exerciseLogs', 'programs', 'gymSessions', 'settings']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Bytes ↔ hex ──

function toHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex) {
  return Uint8Array.from(hex.match(/../g) || [], h => parseInt(h, 16))
}

export function randomHex(bytes) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)))
}

// ── Passwords & tokens ──

export async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  )
  return toHex(bits)
}

function sameHex(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyPassword(password, saltHex, hashHex) {
  return sameHex(await hashPassword(password, saltHex), hashHex)
}

export async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
}

export function newToken() {
  return randomHex(32)
}

function bearerToken(req) {
  const m = (req.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/)
  return m ? m[1] : ''
}

// ── Validation ──

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim())
}

function isValidUsername(username) {
  return typeof username === 'string' && username.length >= 2 && username.length <= 20
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD
}

// ── D1 reads ──

export async function getAccount(env, username) {
  if (!env.DB || !username) return null
  return env.DB.prepare('SELECT username, email, password_hash, salt FROM accounts WHERE username = ?').bind(username).first()
}

export async function isProtected(env, username) {
  return !!(await getAccount(env, username))
}

export async function accountFromToken(env, req) {
  const token = bearerToken(req)
  if (!token || !env.DB) return null
  const row = await env.DB.prepare('SELECT username FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).first()
  return row ? row.username : null
}

// ── D1 writes ──

async function createSession(env, username) {
  const token = newToken()
  await env.DB.prepare('INSERT INTO sessions (token_hash, username, created_at) VALUES (?, ?, ?)')
    .bind(await sha256Hex(token), username, new Date().toISOString())
    .run()
  return token
}

async function ensureKvUser(env, username) {
  if (await env.PUSH_KV.get(`user_${username}`)) return
  await env.PUSH_KV.put(`user_${username}`, JSON.stringify({ username, streak: 0, exercisedToday: false, gymTime: 0, lastExerciseDate: '', lastUpdate: new Date().toISOString() }))
}

// Rename moves the account, its sessions and its cloud copy in one batch.
export async function moveAccount(env, oldName, newName) {
  await env.DB.batch([
    env.DB.prepare('UPDATE accounts SET username = ? WHERE username = ?').bind(newName, oldName),
    env.DB.prepare('UPDATE sessions SET username = ? WHERE username = ?').bind(newName, oldName),
    env.DB.prepare('UPDATE records SET username = ? WHERE username = ?').bind(newName, oldName),
  ])
}

// ── Upload / download shapes ──

function isValidRecordKey(r) {
  return r && CLOUD_STORES.includes(r.store) && typeof r.id === 'string' && r.id.length > 0
}

export function validateUpload(body) {
  const upserts = Array.isArray(body?.upserts) ? body.upserts : []
  const deletes = Array.isArray(body?.deletes) ? body.deletes : []
  if (upserts.length + deletes.length > MAX_BATCH) return { error: `Máximo ${MAX_BATCH} registros por tanda` }
  if (!upserts.every(r => isValidRecordKey(r) && r.data !== undefined)) return { error: 'Registro inválido' }
  if (!deletes.every(isValidRecordKey)) return { error: 'Borrado inválido' }
  return { upserts, deletes }
}

function upsertStatement(env, username, r) {
  return env.DB.prepare('INSERT INTO records (username, store, id, data) VALUES (?, ?, ?, ?) ON CONFLICT (username, store, id) DO UPDATE SET data = excluded.data')
    .bind(username, r.store, r.id, JSON.stringify(r.data))
}

function deleteStatement(env, username, r) {
  return env.DB.prepare('DELETE FROM records WHERE username = ? AND store = ? AND id = ?').bind(username, r.store, r.id)
}

// "after" is "<store>:<id>"; store names never contain ':' so split at the first one.
export function parseCursor(after) {
  if (!after) return null
  const i = after.indexOf(':')
  if (i < 1) return null
  return { store: after.slice(0, i), id: after.slice(i + 1) }
}

async function readPage(env, username, cursor) {
  const base = 'SELECT store, id, data FROM records WHERE username = ?'
  const order = ' ORDER BY store, id LIMIT ?'
  const stmt = cursor
    ? env.DB.prepare(base + ' AND (store > ? OR (store = ? AND id > ?))' + order).bind(username, cursor.store, cursor.store, cursor.id, PAGE_SIZE + 1)
    : env.DB.prepare(base + order).bind(username, PAGE_SIZE + 1)
  const { results } = await stmt.all()
  return results
}

// Builds the JSON by hand: `data` is already JSON text, parsing 1000 of them
// only to stringify them again would burn the free plan's CPU budget.
function pageBody(rows) {
  const more = rows.length > PAGE_SIZE
  const page = more ? rows.slice(0, PAGE_SIZE) : rows
  const records = page.map(r => `{"store":${JSON.stringify(r.store)},"id":${JSON.stringify(r.id)},"data":${r.data}}`)
  const last = page[page.length - 1]
  const next = more ? JSON.stringify(`${last.store}:${last.id}`) : 'null'
  return `{"records":[${records.join(',')}],"next":${next}}`
}

// ── Endpoints ──

export async function handleAccountCreate(req, env, respond) {
  const { username, email, password } = await req.json()
  if (!isValidUsername(username)) return respond({ error: 'Usuario de 2 a 20 caracteres' }, 400)
  if (!isValidEmail(email)) return respond({ error: 'Correo no válido' }, 400)
  if (!isValidPassword(password)) return respond({ error: `Mínimo ${MIN_PASSWORD} caracteres` }, 400)
  if (await isProtected(env, username)) return respond({ error: 'Ese usuario ya está protegido', protected: true }, 409)
  await ensureKvUser(env, username)
  const salt = randomHex(16)
  await env.DB.prepare('INSERT INTO accounts (username, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(username, email.trim(), await hashPassword(password, salt), salt, new Date().toISOString())
    .run()
  return respond({ token: await createSession(env, username) })
}

export async function handleAccountLogin(req, env, respond) {
  const { username, password } = await req.json()
  const account = await getAccount(env, username)
  const ok = account && typeof password === 'string' && await verifyPassword(password, account.salt, account.password_hash)
  if (!ok) return respond({ error: 'Usuario o contraseña incorrectos' }, 401)
  return respond({ token: await createSession(env, username), email: account.email })
}

export async function handleCloudUpload(req, env, respond) {
  const username = await accountFromToken(env, req)
  if (!username) return respond({ error: 'Sesión no válida' }, 401)
  const parsed = validateUpload(await req.json())
  if (parsed.error) return respond({ error: parsed.error }, 400)
  const uploadedAt = new Date().toISOString()
  await env.DB.batch([
    ...parsed.upserts.map(r => upsertStatement(env, username, r)),
    ...parsed.deletes.map(r => deleteStatement(env, username, r)),
    env.DB.prepare('UPDATE accounts SET uploaded_at = ? WHERE username = ?').bind(uploadedAt, username),
  ])
  return respond({ uploadedAt })
}

export async function handleCloudDownload(req, env, respond, url, respondJsonText) {
  const username = await accountFromToken(env, req)
  if (!username) return respond({ error: 'Sesión no válida' }, 401)
  const rows = await readPage(env, username, parseCursor(url.searchParams.get('after')))
  return respondJsonText(pageBody(rows))
}
