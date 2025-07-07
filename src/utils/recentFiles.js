// Recent Files Storage using IndexedDB
const DB_NAME = 'DocumentViewerDB'
const DB_VERSION = 1
const STORE_NAME = 'recentFiles'
const MAX_RECENT_FILES = 10

// Open IndexedDB database
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('lastOpened', 'lastOpened', { unique: false })
      }
    }
  })
}



// Add or update a recent file
export const addRecentFile = async (handle, metadata = {}) => {
  try {
    // Get file info first, before starting the transaction
    let file
    try {
      file = await handle.getFile()
    } catch (error) {
      console.warn('Could not access file for metadata:', error)
      return
    }
    
    const fileData = {
      id: file.name, // Use filename as ID, will update existing entries
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      lastOpened: Date.now(),
      type: file.type || 'text/markdown',
      ...metadata
    }
    

    
    // Now start the transaction and store the data
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    // Add/update the file
    await new Promise((resolve, reject) => {
      const request = store.put(fileData)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    // Clean up old files if we exceed the limit
    await cleanupOldFiles(db)
    
  } catch (error) {
    console.error('Error adding recent file:', error)
  }
}

// Clean up old files, keeping only the most recent MAX_RECENT_FILES
const cleanupOldFiles = async (db) => {
  const transaction = db.transaction([STORE_NAME], 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('lastOpened')
  
  return new Promise((resolve, reject) => {
    const files = []
    const request = index.openCursor(null, 'prev') // Sort by lastOpened descending
    
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        files.push(cursor.value)
        cursor.continue()
      } else {
        // Delete excess files
        if (files.length > MAX_RECENT_FILES) {
          const filesToDelete = files.slice(MAX_RECENT_FILES)
          const deletePromises = filesToDelete.map(file => 
            new Promise((delResolve, delReject) => {
              const delRequest = store.delete(file.id)
              delRequest.onsuccess = () => delResolve()
              delRequest.onerror = () => delReject(delRequest.error)
            })
          )
          
          Promise.all(deletePromises)
            .then(() => resolve())
            .catch(reject)
        } else {
          resolve()
        }
      }
    }
    
    request.onerror = () => reject(request.error)
  })
}

// Get all recent files
export const getRecentFiles = async () => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('lastOpened')
    
    return new Promise((resolve, reject) => {
      const files = []
      const request = index.openCursor(null, 'prev') // Sort by lastOpened descending
      
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          files.push(cursor.value)
          cursor.continue()
        } else {
          resolve(files)
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error getting recent files:', error)
    return []
  }
}

// Remove a specific recent file
export const removeRecentFile = async (fileId) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.delete(fileId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error removing recent file:', error)
  }
}

// Clear all recent files
export const clearRecentFiles = async () => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error clearing recent files:', error)
  }
}

// Format file size for display
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format date for display
export const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = (now - date) / (1000 * 60 * 60)
  
  if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffInHours < 24 * 7) {
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }
} 