// ─────────────────────────────────────────────
// FILE SYSTEM ACCESS API + INDEXEDDB
//
// IndexedDB stores the folder handle so the user
// doesn't have to re-pick the folder every session.
//
// The folder handle is a pointer to the folder the
// user chose. On each new session, the browser uses
// this pointer to ask "Allow again?" — one click,
// no folder picker shown.
// ─────────────────────────────────────────────

const DB_NAME    = "trip-planner-db"
const STORE_NAME = "handles"
const DB_VERSION = 1

// Open (or create) the IndexedDB database
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  })
}

// Save the folder handle to IndexedDB after user picks a folder
export async function saveFolderHandle(handle) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).put(handle, "folder")
    tx.oncomplete = resolve
    tx.onerror    = (e) => reject(e.target.error)
  })
}

// Load the saved folder handle from IndexedDB
export async function loadFolderHandle() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly")
    const req = tx.objectStore(STORE_NAME).get("folder")
    req.onsuccess = (e) => resolve(e.target.result || null)
    req.onerror   = (e) => reject(e.target.error)
  })
}

// Show the folder picker and save the handle
export async function pickFolder() {
  const handle = await window.showDirectoryPicker({ mode: "readwrite" })
  await saveFolderHandle(handle)
  return handle
}

// Get a working folder handle:
// - Loads from IndexedDB
// - Asks browser to restore permission (one click, no picker)
// - Returns null if not available
export async function getFolder() {
  try {
    const handle = await loadFolderHandle()
    if (!handle) return null

    const permission = await handle.requestPermission({ mode: "readwrite" })
    if (permission === "granted") return handle

    return null
  } catch {
    return null
  }
}
