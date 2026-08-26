const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast'

const GEMINI_SAFETY = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
]

const COACH_SCHEMA = {
  type: 'object',
  properties: {
    analysis: { type: 'string' },
    verdict: { type: 'string', enum: ['positive', 'neutral', 'warning'] },
    proximo_objetivo: { type: 'string' },
    recommendations: { type: 'array', items: { type: 'string' } },
    rotation_topic: { type: 'string' },
  },
  required: ['analysis', 'verdict', 'rotation_topic'],
}

const WEEKS_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      tag: { type: 'string', enum: ['VOLUMEN', 'FUERZA', 'RESISTENCIA'] },
      days: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            subtitle: { type: 'string' },
            duration_min: { type: 'number' },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  exercise_name: { type: 'string' },
                  muscle: { type: 'string' },
                  sets: { type: 'number' },
                  reps: { type: 'string' },
                  rest_sec: { type: 'number' },
                  load_weight: { type: 'number' },
                  units: { type: 'string', enum: ['kg', 'lb'] },
                },
                required: ['exercise_name', 'muscle', 'sets', 'reps', 'rest_sec'],
              },
            },
          },
          required: ['name', 'exercises'],
        },
      },
    },
    required: ['name', 'days'],
  },
}

const IMPORT_SCHEMA = {
  type: 'object',
  properties: {
    program_name: { type: 'string' },
    weeks: WEEKS_SCHEMA,
  },
  required: ['program_name', 'weeks'],
}

// program-coach can answer with a full modified program OR a plain message;
// "type" tells the client (and buildProgramFromAIResponse) which shape it got.
const PROGRAM_COACH_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['program', 'message'] },
    program_name: { type: 'string' },
    weeks: WEEKS_SCHEMA,
    message: { type: 'string' },
  },
  required: ['type'],
}

async function callGemini(messages, apiKey, opts = {}) {
  const { maxTokens = 4096, responseFormat = 'text', responseSchema, model = 'gemini-2.5-flash', safetySettings } = opts

  const systemMsg = messages.find(m => m.role === 'system')
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }],
    }))

  const generationConfig = { maxOutputTokens: maxTokens }
  if (responseFormat === 'json') {
    generationConfig.responseMimeType = 'application/json'
    if (responseSchema) generationConfig.responseSchema = responseSchema
  }

  const body = { contents, generationConfig }
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  if (safetySettings) body.safetySettings = safetySettings

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini ${res.status}: ${errText}`)
  }

  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
}

async function callAI(messages, env, opts = {}) {
  const maxTokens = opts.maxTokens || 4096
  let text = ''
  let provider = 'llama'

  if (env.GEMINI_API_KEY) {
    try {
      text = await callGemini(messages, env.GEMINI_API_KEY, { ...opts, maxTokens })
      provider = 'gemini'
    } catch (err) {
      console.error('[AI] Gemini failed:', err.message, 'opts:', JSON.stringify(opts).slice(0, 300))
    }
  }

  if (!text) {
    const aiRes = await env.AI.run(AI_MODEL, {
      messages,
      stream: false,
      max_tokens: maxTokens,
    })
    if (aiRes && typeof aiRes.response === 'string') {
      text = aiRes.response.trim()
    } else if (aiRes?.choices?.[0]?.message?.content) {
      text = aiRes.choices[0].message.content.trim()
    } else {
      const shape = aiRes ? JSON.stringify(aiRes).slice(0, 500) : 'null/undefined'
      console.error('[AI] Unexpected aiRes shape:', shape)
      text = ''
    }
    provider = 'llama'
  }

  return { text, provider }
}

function buildProfileBlock(profile) {
  if (!profile) return ''
  const parts = []
  if (profile.sex) parts.push(profile.sex === 'M' ? 'un hombre' : profile.sex === 'F' ? 'una mujer' : `de sexo ${profile.sex}`)
  if (profile.age) parts.push(`de ${profile.age} años`)
  if (profile.experience) parts.push(`con nivel ${profile.experience}`)
  if (profile.goal) parts.push(`con el objetivo de ${profile.goal}`)
  if (profile.occupation) parts.push(`que trabaja como ${profile.occupation}`)
  if (profile.body_weight) parts.push(`con un peso de ${profile.body_weight}`)
  if (profile.height_cm) parts.push(`y estatura de ${profile.height_cm} cm`)

  if (!parts.length) return ''
  const desc = parts.join(', ')
  return `\n\nPERFIL DEL USUARIO:\nEl usuario es ${desc}.`
}

function parseAIResponse(text) {
  text = (text || '').trim()
  const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (m) text = m[1].trim()
  try { return JSON.parse(text) } catch { return null }
}

async function handleAIEndpoint(req, env, { buildPrompt, schema, model, maxTokens }) {
  const body = await req.json()

  const aiOpts = { safetySettings: GEMINI_SAFETY }
  if (schema) {
    aiOpts.responseFormat = 'json'
    aiOpts.responseSchema = schema
  }
  if (model) aiOpts.model = model
  if (maxTokens) aiOpts.maxTokens = maxTokens

  const messages = body.messages?.length
    ? [{ role: 'system', content: body.systemPrompt || '' }, ...body.messages]
    : [
        { role: 'system', content: body.systemPrompt || '' },
        { role: 'user', content: buildPrompt(body) },
      ]

  const { text, provider } = await callAI(messages, env, aiOpts)

  const parsed = schema ? parseAIResponse(text) : null
  return { parsed, text, provider }
}

// ── Web Push send (manual, no web-push library) ──

// Wake the device's Service Worker with a payload-less push (VAPID auth only).
// The SW reads the notification spec from its local Cache. Encrypted payloads
// (RFC 8291) are not reliably decrypted on iOS, so we avoid them entirely.
async function sendEmptyPush(sub, vapidPub, vapidPriv, vapidEmail) {
  const vapidJwt = await _signVapid(vapidEmail, vapidPriv, vapidPub, sub.endpoint)
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Length': '0',
      'Authorization': `vapid t=${vapidJwt}, k=${vapidPub}`,
      'TTL': '86400',
    },
  })
  const body = await res.text().catch(() => '')
  console.log('[PUSH_RESULT] empty status:', res.status, 'endpoint:', sub.endpoint.slice(0, 40))
  if (res.status === 410) throw { statusCode: 410, message: 'Subscription expired' }
  if (!res.ok) throw { message: `Push service returned ${res.status} ${body}` }
}

function _base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

async function _signVapid(email, privateKeyB64, publicKeyB64, endpoint) {
  const privateKey = _base64UrlDecode(privateKeyB64)
  const header = _base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const now = Math.floor(Date.now() / 1000)
  const claims = { aud: new URL(endpoint).origin, exp: now + 86400, sub: email }
  const payload = _base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)))
  const toSign = new TextEncoder().encode(`${header}.${payload}`)
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await crypto.subtle.importKey('jwk', await _vapidJwk(privateKey, publicKeyB64), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']), toSign))
  const rawSig = _rawEcdsaSig(sig)
  return `${header}.${payload}.${_base64UrlEncode(rawSig)}`
}

async function _vapidJwk(privateKey, publicKeyB64) {
  const pubRaw = _base64UrlDecode(publicKeyB64)
  const x = pubRaw.slice(1, 33)
  const y = pubRaw.slice(33, 65)
  const d = _base64UrlEncode(privateKey)
  const xB64 = _base64UrlEncode(x)
  const yB64 = _base64UrlEncode(y)
  return { kty: 'EC', crv: 'P-256', d, x: xB64, y: yB64 }
}

function _base64UrlEncode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function _rawEcdsaSig(sig) {
  // subtle.sign may return DER (variable length) or raw 64-byte (IEEE P1363)
  if (sig.length === 64) return sig
  // Parse DER-encoded ECDSA signature
  let off = 2
  const rLen = sig[off + 1]
  const r = sig.slice(off + 2, off + 2 + rLen)
  off += 2 + rLen
  const sLen = sig[off + 1]
  const s = sig.slice(off + 2, off + 2 + sLen)
  // Reduce or pad to exactly 32 bytes each
  const to32 = (v) => {
    if (v.length > 32) v = v.slice(v.length - 32)
    if (v.length < 32) { const a = new Uint8Array(32); a.set(v, 32 - v.length); return a }
    return v
  }
  const out = new Uint8Array(64)
  out.set(to32(r), 0)
  out.set(to32(s), 32)
  return out
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
    }

    const url = new URL(req.url)

    function respond(data, status = 200) {
      const body = typeof data === 'string' ? data : JSON.stringify(data)
      const headers = { ...corsHeaders }
      if (typeof data !== 'string') headers['Content-Type'] = 'application/json'
      return new Response(body, { status, headers })
    }

    if (url.pathname === '/api/push/subscribe') {
      if (!env.PUSH_KV) return respond('Push KV not configured', 501)
      try {
        const { subscription, deviceId } = await req.json()
        if (!deviceId) return respond('deviceId required', 400)
        await env.PUSH_KV.put(`sub_${deviceId}`, JSON.stringify(subscription))
        return respond('ok')
      } catch (err) {
        return respond('Invalid subscription', 400)
      }
    }

    if (url.pathname === '/api/push/unsubscribe') {
      if (!env.PUSH_KV) return respond('Push KV not configured', 501)
      try {
        const { deviceId } = await req.json()
        if (deviceId) await env.PUSH_KV.delete(`sub_${deviceId}`)
      } catch {}
      return respond('ok')
    }

    // Wake the SW so it shows the "Tap para iniciar descanso" notification it
    // already staged in its local cache. Empty push (no decryption needed).
    if (url.pathname === '/api/push/start') {
      if (!env.PUSH_KV) return respond('Push KV not configured', 501)
      let deviceId
      try {
        const body = await req.json()
        deviceId = body.deviceId
        if (!deviceId) return respond('deviceId required', 400)
        const raw = await env.PUSH_KV.get(`sub_${deviceId}`)
        if (!raw) return respond('No subscription', 404)
        const sub = JSON.parse(raw)
        const vapidPub = env.VAPID_PUBLIC_KEY
        const vapidPriv = env.VAPID_PRIVATE_KEY
        const vapidEmail = env.VAPID_EMAIL || 'mailto:pedro@example.com'
        if (!vapidPub || !vapidPriv) return respond('VAPID keys not configured', 500)

        await sendEmptyPush(sub, vapidPub, vapidPriv, vapidEmail)
        return respond({ status: 'sent' })
      } catch (err) {
        if (err && err.statusCode === 410 && deviceId) {
          await env.PUSH_KV.delete(`sub_${deviceId}`)
          return respond('Subscription expired — cleaned up', 410)
        }
        return respond({ error: err.message || 'unknown' }, 500)
      }
    }

    if (url.pathname === '/api/ai/coach') {
      try {
        const result = await handleAIEndpoint(req, env, {
          buildPrompt: (body) => 'DATOS DE LA SESIÓN:\n' + JSON.stringify(body.sessionData),
          schema: COACH_SCHEMA,
        })

        if (!result.parsed) return respond({ error: 'La IA no generó JSON válido', raw: result.text, _provider: result.provider }, 502)
        return respond({ ...result.parsed, _provider: result.provider })
      } catch (err) {
        return respond({ error: 'Error de IA: ' + err.message }, 500)
      }
    }

    if (url.pathname === '/api/ai/import') {
      try {
        const result = await handleAIEndpoint(req, env, {
          buildPrompt: (body) => {
            const dictBlock = (body.dictionary?.length)
              ? '\n\nDICCIONARIO DE EJERCICIOS (usa el campo "es" EXACTO cuando el ejercicio corresponda; "en" y "aliases" son solo para ayudarte a identificarlo):\n' + JSON.stringify(body.dictionary)
              : ''
            return 'RUTINA DEL USUARIO:\n' + body.text + buildProfileBlock(body.userProfile) + dictBlock
          },
          schema: IMPORT_SCHEMA,
          model: 'gemini-2.5-flash',
          maxTokens: 16384,
        })

        if (!result.parsed) return respond({ error: 'La IA no generó JSON válido. Intenta simplificar la rutina.', raw: result.text, _provider: result.provider }, 502)
        return respond({ ...result.parsed, _provider: result.provider })
      } catch (err) {
        return respond({ error: 'Error de IA: ' + err.message }, 500)
      }
    }

    if (url.pathname === '/api/ai/generate-program') {
      try {
        const result = await handleAIEndpoint(req, env, {
          buildPrompt: (body) => {
            const overrideBlock = body.overrides
              ? '\n\nPREFERENCIAS DEL USUARIO:\n' + JSON.stringify(body.overrides)
              : ''
            return 'Genera 1 semana de entrenamiento para este usuario.' + buildProfileBlock(body.userProfile) + overrideBlock
          },
          schema: IMPORT_SCHEMA,
          model: 'gemini-2.5-flash',
          maxTokens: 16384,
        })

        if (!result.parsed) return respond({ error: 'La IA no generó JSON válido. Intenta de nuevo.', raw: result.text, _provider: result.provider }, 502)
        return respond({ ...result.parsed, _provider: result.provider })
      } catch (err) {
        return respond({ error: 'Error de IA: ' + err.message }, 500)
      }
    }

    if (url.pathname === '/api/ai/program-coach') {
      try {
        const result = await handleAIEndpoint(req, env, {
          buildPrompt: (body) => {
            return 'PROGRAMA ACTUAL:\n' + JSON.stringify(body.currentProgram)
              + buildProfileBlock(body.userProfile)
              + '\n\nPREGUNTA DEL USUARIO:\n' + body.text
              + '\n\nDICCIONARIO DE EJERCICIOS:\n' + JSON.stringify(body.dictionary || [])
          },
          schema: PROGRAM_COACH_SCHEMA,
          model: 'gemini-2.5-flash',
          maxTokens: 16384,
        })

        const parsed = result.parsed
        if (parsed && parsed.weeks) {
          return respond({ program: parsed, _provider: result.provider })
        }
        return respond({ message: parsed?.message || result.text || '', _provider: result.provider })
      } catch (err) {
        return respond({ error: 'Error de IA: ' + err.message }, 500)
      }
    }

    if (url.pathname === '/api/ai/exercise-coach') {
      try {
        const result = await handleAIEndpoint(req, env, {
          buildPrompt: () => '',
        })
        return respond({ reply: result.text || '', _provider: result.provider })
      } catch (err) {
        return respond({ error: 'Error de IA: ' + err.message }, 500)
      }
    }

    if (url.pathname === '/api/rest-timer/cancel') {
      try {
        const { tag } = await req.json()
        if (tag) await env.PUSH_KV.put(`cancel_${tag}`, '1', { expirationTtl: 3600 })
        return respond('ok')
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }

    // ── User & Friends endpoints ──

    if (url.pathname === '/api/user/register') {
      try {
        const { username } = await req.json()
        if (!username || username.length < 2) return respond({ error: 'Username must be at least 2 characters' }, 400)
        const existing = await env.PUSH_KV.get(`user_${username}`)
        if (existing) return respond({ error: 'Nombre de usuario ya registrado' }, 409)
        await env.PUSH_KV.put(`user_${username}`, JSON.stringify({ username, streak: 0, exercisedToday: false, lastExerciseDate: '', lastUpdate: new Date().toISOString() }))
        return respond({ status: 'ok' })
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }

    if (url.pathname === '/api/user/sync') {
      try {
        const { username, streak, exercisedToday } = await req.json()
        if (!username) return respond({ error: 'username required' }, 400)
        const raw = await env.PUSH_KV.get(`user_${username}`)
        const data = raw ? JSON.parse(raw) : { username }
        data.streak = streak ?? data.streak ?? 0
        data.exercisedToday = exercisedToday ?? data.exercisedToday ?? false
        data.lastExerciseDate = exercisedToday ? new Date().toISOString().slice(0, 10) : data.lastExerciseDate
        data.lastUpdate = new Date().toISOString()
        await env.PUSH_KV.put(`user_${username}`, JSON.stringify(data))
        return respond({ status: 'ok' })
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }

    if (url.pathname === '/api/friends/search') {
      try {
        const q = url.searchParams.get('q') || ''
        if (q.length < 1) return respond({ results: [] })
        let keys = []
        let cursor = undefined
        do {
          const page = await env.PUSH_KV.list({ prefix: 'user_', cursor, limit: 1000 })
          keys = keys.concat(page.keys)
          cursor = page.list_complete ? undefined : page.cursor
        } while (cursor)
        const users = await Promise.all(keys.map(k => env.PUSH_KV.get(k.name).then(r => r ? JSON.parse(r) : null)))
        const ql = q.toLowerCase()
        const results = users
          .filter(u => u && u.username && u.username.toLowerCase().includes(ql))
          .map(u => ({ username: u.username, streak: u.streak, exercisedToday: u.exercisedToday }))
        return respond({ results })
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }

    if (url.pathname === '/api/friends/add') {
      try {
        const { username, friendUsername } = await req.json()
        if (!username || !friendUsername) return respond({ error: 'username and friendUsername required' }, 400)
        if (username === friendUsername) return respond({ error: 'No puedes agregarte a ti mismo' }, 400)
        const friendRaw = await env.PUSH_KV.get(`user_${friendUsername}`)
        if (!friendRaw) return respond({ error: 'Usuario no encontrado' }, 404)
        const existingRaw = await env.PUSH_KV.get(`friends_${username}`)
        const friends = existingRaw ? JSON.parse(existingRaw) : []
        if (friends.some(f => f.friendUsername === friendUsername)) return respond({ error: 'Ya es tu amigo' }, 409)
        friends.push({ friendUsername, addedAt: new Date().toISOString() })
        await env.PUSH_KV.put(`friends_${username}`, JSON.stringify(friends))
        return respond({ status: 'ok' })
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }

    if (url.pathname === '/api/friends/list') {
      try {
        const username = url.searchParams.get('username')
        if (!username) return respond({ error: 'username required' }, 400)
        const rawFriends = await env.PUSH_KV.get(`friends_${username}`)
        const friendUsernames = rawFriends ? JSON.parse(rawFriends) : []
        const friends = []
        for (const f of friendUsernames) {
          const raw = await env.PUSH_KV.get(`user_${f.friendUsername}`)
          if (raw) {
            const u = JSON.parse(raw)
            friends.push({ username: u.username, streak: u.streak, exercisedToday: u.exercisedToday, lastUpdate: u.lastUpdate })
          }
        }
        return respond({ friends })
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }

    if (url.pathname === '/api/rest-timer/start') {
      try {
        const { endTime, deviceId, tag, title, body, exerciseId, sets, reps, restSec } = await req.json()
        if (!endTime || !deviceId || !tag) return respond({ error: 'endTime, deviceId, tag required' }, 400)
        const now = Date.now()
        const delayMs = endTime - now
        if (delayMs <= 0) return respond({ error: 'endTime already passed — client clock ' + delayMs + 'ms behind' }, 400)
        const delaySec = Math.ceil(delayMs / 1000)
        // Record this as the device's only "active" rest tag. The consumer drops
        // any queued message whose tag is no longer the active one, so duplicate
        // or superseded schedules (multi-tab, retries) never fire twice.
        await env.PUSH_KV.put(`active_${deviceId}`, tag, { expirationTtl: 3600 })
        await env.REST_TIMER_QUEUE.send({ deviceId, tag, title, body, exerciseId, sets, reps, restSec }, { delaySeconds: delaySec })
        return respond({ status: 'scheduled', delaySec, delayMs, clientEndTime: endTime, serverNow: now })
      } catch (err) {
        return respond({ error: err.message }, 500)
      }
    }

    return respond('Not Found', 404)
  },

  async queue(batch, env) {
    for (const msg of batch.messages) {
      const { deviceId, tag } = msg.body
      // Cancelled by the client.
      const cancelled = await env.PUSH_KV.get(`cancel_${tag}`)
      if (cancelled) {
        await env.PUSH_KV.delete(`cancel_${tag}`)
        msg.ack()
        continue
      }
      // Already delivered once (Queues are at-least-once → guard redeliveries).
      if (await env.PUSH_KV.get(`sent_${tag}`)) { msg.ack(); continue }
      // Superseded by a newer schedule for this device (multi-tab / re-tap).
      const active = await env.PUSH_KV.get(`active_${deviceId}`)
      if (active && active !== tag) { msg.ack(); continue }
      const raw = await env.PUSH_KV.get(`sub_${deviceId}`)
      if (!raw) { msg.ack(); continue }
      const sub = JSON.parse(raw)
      const vapidPub = env.VAPID_PUBLIC_KEY
      const vapidPriv = env.VAPID_PRIVATE_KEY
      const vapidEmail = env.VAPID_EMAIL || 'mailto:pedro@example.com'
      if (!vapidPub || !vapidPriv) { msg.retry({ delaySeconds: 10 }); continue }
      try {
        await sendEmptyPush(sub, vapidPub, vapidPriv, vapidEmail)
      } catch (err) {
        if (err.statusCode === 410) await env.PUSH_KV.delete(`sub_${deviceId}`)
        msg.retry({ delaySeconds: 10 })
        continue
      }
      // Mark delivered so a redelivery of this exact tag is a no-op.
      await env.PUSH_KV.put(`sent_${tag}`, '1', { expirationTtl: 3600 })
      msg.ack()
    }
  },
}
