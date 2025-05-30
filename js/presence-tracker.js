const DB_NAME = 'in-office-presence'
const DB_VERSION = 1
const STORE_NAME = 'check-in/check-out'

let db

const request = indexedDB.open(DB_NAME, DB_VERSION)

request.onupgradeneeded = function(event) {
  db = event.target.result
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    console.info("Create object store", STORE_NAME, "at version", DB_VERSION)
    db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true })
  }
}

request.onsuccess = function(event) {
  db = event.target.result
}

request.onerror = function(event) {
  console.error("Failed to open database", event.target.error)
}

function insertEvent(data) {
  const transaction = db.transaction(STORE_NAME, "readwrite")
  const store = transaction.objectStore(STORE_NAME)
  const insertRequest = store.add(data)

//   insertRequest.onsuccess = () => {
//     console.log("Event saved:", data)
//   }

  insertRequest.onerror = (e) => {
    console.error("Failed to save event", e.target.error)
  }
}

function clearEvents() {
  const transaction = db.transaction(STORE_NAME, "readwrite")
  const store = transaction.objectStore(STORE_NAME)
  const clearRequest = store.clear()

  clearRequest.onsuccess = () => {
    console.info("Events cleared")
  }

  clearRequest.onerror = (e) => {
    console.error("Failed to clear events", e.target.error)
  }
}

function exportEvents(callback) {
  if (!callback) {
    console.warn('Callback not found')
    return
  }

  const transaction = db.transaction(STORE_NAME, "readonly")
  const store = transaction.objectStore(STORE_NAME)
  const exportRequest = store.getAll()

  exportRequest.onsuccess = function() {
    const results = exportRequest.result
    console.info("Events exported")

    if (results.length === 0) {
      console.warn('No events in the database')
      return
    }

    // Header
    const headers = Object.keys(results[0])
    const lines = [
      headers.join(",")
    ]

    // Build CSV lines
    for (const event of results) {
      const line = headers.map(h => {
        const val = event[h] ?? ""
        // Escape quotes and apostrophies
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(",")
      lines.push(line)
    }

    const csv = lines.join("\r\n")

    callback(csv)
  }

  exportRequest.onerror = function(e) {
    console.error('Export failed', e.target.error)
  }
}

export { insertEvent, clearEvents, exportEvents }