// Dates and IndexedDB for big.spec.cjs: what the app stored, read in the page,
// and the seed of the tests apart (never the flow's). Not a test file:
// Playwright only collects *.spec.*.

const DB_NAME = 'coach-pedro-ai'
const STORES = ['exercises', 'exerciseLogs', 'programs', 'settings', 'gymSessions']

/** Today's weekday, Mon=0..Sun=6 (the app's) */
function getDayIdx() {
  return (new Date().getDay() + 6) % 7
}

// The local calendar date `daysAgo` days back (YYYY-MM-DD). Walks calendar
// days at noon, so a DST change in between can't land on the wrong date.
function localDate(daysAgo = 0) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** A week whose only workout is today: rest days up to it */
function buildDayArray(workoutDay) {
  const idx = getDayIdx()
  const days = []
  for (let i = 0; i < idx; i++) {
    days.push({ name: 'Rest', subtitle: '', duration: 0, exercises: [] })
  }
  days.push(workoutDay)
  return days
}

async function seedIndexedDB(page, data, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.evaluate(([d, name, stores]) => {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open(name, 2)
          req.onupgradeneeded = () => {
            const db = req.result
            stores.forEach((s) => {
              if (db.objectStoreNames.contains(s)) return
              const store = db.createObjectStore(s, { keyPath: 'id' })
              if (s === 'exerciseLogs') {
                store.createIndex('exerciseId', 'exerciseId', { unique: false })
                store.createIndex('date', 'date', { unique: false })
              }
            })
          }
          req.onsuccess = () => {
            try {
              const db = req.result
              const tx = db.transaction(stores, 'readwrite')
              stores.forEach((s) => tx.objectStore(s).clear())
              d.exercises.forEach(ex => tx.objectStore('exercises').put(ex))
              ;(d.exerciseLogs || []).forEach(log => tx.objectStore('exerciseLogs').put(log))
              if (d.program) tx.objectStore('programs').put(d.program)
              ;(d.gymSessions || []).forEach(g => tx.objectStore('gymSessions').put(g))
              tx.objectStore('settings').put(d.settings)
              tx.oncomplete = () => { db.close(); resolve() }
              tx.onerror = () => reject(tx.error)
            } catch (e) {
              reject(e)
            }
          }
          req.onerror = () => reject(req.error)
        })
      }, [data, DB_NAME, STORES])
      return // success
    } catch (e) {
      if (attempt === retries) throw e
      // The page was still navigating: let it settle, then try again
      await page.waitForLoadState('load')
    }
  }
}

// Every record of one IndexedDB store, read in the page. It rejects on any
// error or after 5 s: page.evaluate has no timeout of its own, so a stuck
// open would otherwise hang until the flow's 10-minute budget.
function readStore(page, store) {
  return page.evaluate(([store, name]) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`readStore(${store}) timed out`)), 5000)
    const fail = (e) => { clearTimeout(timer); reject(e) }
    const req = indexedDB.open(name, 2)
    req.onerror = () => fail(req.error)
    req.onblocked = () => fail(new Error(`readStore(${store}) blocked`))
    req.onsuccess = () => {
      const db = req.result
      try {
        const all = db.transaction(store, 'readonly').objectStore(store).getAll()
        all.onsuccess = () => { clearTimeout(timer); db.close(); resolve(all.result) }
        all.onerror = () => { db.close(); fail(all.error) }
      } catch (e) {
        db.close()
        fail(e)
      }
    }
  }), [store, DB_NAME])
}

// Settings as persisted in IndexedDB. A goto/reload right after a tap can beat
// settings.update()'s write; polling this is the real "it's saved" signal.
async function storedSettings(page) {
  return (await readStore(page, 'settings')).find(s => s.id === 'settings') || null
}

// A program as persisted in IndexedDB, by name
async function storedProgram(page, name) {
  return (await readStore(page, 'programs')).find(p => p.name === name) || null
}

function readLogs(page) {
  return readStore(page, 'exerciseLogs')
}

function readExercises(page) {
  return readStore(page, 'exercises')
}

module.exports = {
  getDayIdx, localDate, buildDayArray,
  seedIndexedDB, readStore, storedSettings, storedProgram, readLogs, readExercises,
}
