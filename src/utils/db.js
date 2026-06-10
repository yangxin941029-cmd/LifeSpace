// src/utils/db.js
// 使用 IndexedDB 封装笔记数据管理

const DB_NAME = 'LifeSpaceDB'
const DB_VERSION = 1
const STORE_NAME = 'notes'

let db = null

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('updateTime', 'updateTime', { unique: false })
      }
    }

    request.onsuccess = (event) => {
      db = event.target.result
      resolve(db)
    }

    request.onerror = (event) => {
      reject('Database error: ' + event.target.error)
    }
  })
}

export async function getAllNotes() {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      // 按更新时间倒序排列
      const notes = request.result.sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime))
      resolve(notes)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getNote(id) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveNote(note) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    // 自动添加/更新 updateTime
    note.updateTime = new Date().toISOString()
    
    const request = store.put(note)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteNote(id) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
