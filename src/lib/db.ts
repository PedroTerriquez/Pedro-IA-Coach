const DB_NAME = 'coach-pedro-ai'
const DB_VERSION = 1

const STORES = ['exercises', 'exerciseLogs', 'programs', 'settings']

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result
      STORES.forEach((s) => {
        if (!db.objectStoreNames.contains(s)) {
          const store = db.createObjectStore(s, { keyPath: 'id' })
          if (s === 'exerciseLogs') {
            store.createIndex('exerciseId', 'exerciseId', { unique: false })
            store.createIndex('date', 'date', { unique: false })
          }
        }
      })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getAll<T = any>(storeName: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    let result: T[]
    req.onsuccess = () => { result = req.result }
    tx.oncomplete = () => { db.close(); resolve(result || []) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function get<T = any>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).get(id)
    let result: T | undefined
    req.onsuccess = () => { result = req.result }
    tx.oncomplete = () => { db.close(); resolve(result) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function put(storeName: string, data: any): Promise<IDBValidKey> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).put(data)
    let result: IDBValidKey
    req.onsuccess = () => { result = req.result }
    tx.oncomplete = () => { db.close(); resolve(result) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function del(storeName: string, id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(id)
    tx.oncomplete = () => { resolve(); db.close() }
    tx.onerror = () => { reject(tx.error); db.close() }
  })
}

export async function getByIndex<T = any>(storeName: string, indexName: string, value: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).index(indexName).getAll(value)
    let result: T[]
    req.onsuccess = () => { result = req.result }
    tx.oncomplete = () => { db.close(); resolve(result || []) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function generateId(): Promise<string> {
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return 'id-' + Array.from(arr, (b) => b.toString(36).padStart(2, '0')).join('')
}
