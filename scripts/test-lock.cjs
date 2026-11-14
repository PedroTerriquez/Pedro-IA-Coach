// One Playwright run at a time per checkout. Several agent sessions share this
// working tree, its build/ and the test preview: two runs at once rebuild under
// each other and starve the machine (9 browsers), so steps fail at random.
// The config takes this lock before the webServer builds; a second run waits
// here until the first ends. A lock left by a dead process is taken over.
const fs = require('fs')
const path = require('path')

const LOCK = path.join(__dirname, '..', '.playwright-lock')
const WAIT_MS = 30 * 60 * 1000

function holder() {
  try {
    return Number(fs.readFileSync(LOCK, 'utf8')) || 0
  } catch {
    return 0
  }
}

function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e.code === 'EPERM'
  }
}

function tryTake() {
  try {
    fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' })
    return true
  } catch {
    const pid = holder()
    if (pid && alive(pid)) return pid === process.pid
    if (holder() === pid) fs.rmSync(LOCK, { force: true })
    return false
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function release() {
  if (holder() === process.pid) fs.rmSync(LOCK, { force: true })
}

// With the lock held no other run can own the port: whatever listens there
// is left over from a crashed run.
function freePort(port) {
  let pids = ''
  try {
    pids = require('child_process').execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' })
  } catch {
    return
  }
  for (const pid of pids.split('\n').map(Number).filter(Boolean)) {
    try { process.kill(pid) } catch {}
  }
  if (pids.trim()) sleep(500)
}

function takeTestLock(port) {
  // Workers load the config too; only the runner holds the lock.
  if (process.env.TEST_WORKER_INDEX !== undefined || process.env.PW_NO_LOCK) return
  const start = Date.now()
  let told = false
  while (!tryTake()) {
    if (!told) {
      console.log(`⏳ Otra corrida de Playwright está activa (pid ${holder()}). Esperando turno…`)
      told = true
    }
    if (Date.now() - start > WAIT_MS) throw new Error('test-lock: 30 min esperando a otra corrida')
    sleep(2000)
  }
  process.env.PW_NO_LOCK = '1'
  process.on('exit', release)
  if (port) freePort(port)
}

module.exports = { takeTestLock }
