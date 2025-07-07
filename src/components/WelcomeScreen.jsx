import { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, FolderOpen, X, Clock } from 'lucide-react'
import { getRecentFiles, removeRecentFile, clearRecentFiles, formatFileSize, formatDate } from '../utils/recentFiles'

const WelcomeScreen = ({ onNewFile, onOpenFile }) => {
  const [recentFiles, setRecentFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragActive, setDragActive] = useState(false)

  // Load recent files on mount
  useEffect(() => {
    loadRecentFiles()
  }, [])

  const loadRecentFiles = async () => {
    try {
      const files = await getRecentFiles()
      setRecentFiles(files)
    } catch (error) {
      console.error('Error loading recent files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveRecent = async (fileId, event) => {
    event.stopPropagation()
    try {
      await removeRecentFile(fileId)
      await loadRecentFiles()
    } catch (error) {
      console.error('Error removing recent file:', error)
    }
  }

  const handleClearRecent = async () => {
    if (window.confirm('Clear all recent files?')) {
      try {
        await clearRecentFiles()
        await loadRecentFiles()
      } catch (error) {
        console.error('Error clearing recent files:', error)
      }
    }
  }

  const handleOpenRecent = async (recentFile) => {
    try {
      // Show helpful message then open file picker
      alert(`Please select "${recentFile.name}" from the file picker.\n\nDue to browser security, you need to re-grant access to this file.`)
      onOpenFile()
    } catch (error) {
      console.error('Error opening recent file:', error)
      // If file can't be opened, remove it from recent files
      await handleRemoveRecent(recentFile.id, { stopPropagation: () => {} })
    }
  }

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        // For now, we'll just trigger the file open dialog
        // File System Access API doesn't directly support dropped files as handles
        onOpenFile()
      } else {
        alert('Please drop a markdown file (.md or .markdown)')
      }
    }
  }, [onOpenFile])

  useEffect(() => {
    document.addEventListener('dragenter', handleDrag)
    document.addEventListener('dragleave', handleDrag)
    document.addEventListener('dragover', handleDrag)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDrag)
      document.removeEventListener('dragleave', handleDrag)
      document.removeEventListener('dragover', handleDrag)
      document.removeEventListener('drop', handleDrop)
    }
  }, [handleDrag, handleDrop])

  return (
    <div className={`welcome-screen ${dragActive ? 'drag-active' : ''}`}>
      <div className="welcome-content">
        {/* Header Section */}
        <div className="welcome-header">
          <div className="welcome-icon">
            <FileText size={48} />
          </div>
          <h1 className="welcome-title">Document Viewer</h1>
          <p className="welcome-description">
            A modern markdown editor with live preview, table support, and document outline.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="welcome-actions">
          <button 
            className="welcome-button primary" 
            onClick={onNewFile}
          >
            <Plus size={20} />
            <span>New Document</span>
            <kbd>⌘N</kbd>
          </button>
          <button 
            className="welcome-button secondary" 
            onClick={onOpenFile}
          >
            <FolderOpen size={20} />
            <span>Open File</span>
            <kbd>⌘O</kbd>
          </button>
        </div>

        {/* Recent Files Section */}
        {!loading && recentFiles.length > 0 && (
          <div className="recent-files-section">
            <div className="recent-files-header">
              <h2 className="recent-files-title">
                <Clock size={20} />
                Recent Files
              </h2>
              <button 
                className="clear-recent-btn"
                onClick={handleClearRecent}
                title="Clear all recent files"
              >
                Clear All
              </button>
            </div>
            
            <div className="recent-files-grid">
              {recentFiles.slice(0, 6).map((file) => (
                <div
                  key={file.id}
                  className="recent-file-card"
                  onClick={() => handleOpenRecent(file)}
                >
                  <div className="recent-file-icon">
                    <FileText size={24} />
                  </div>
                  <div className="recent-file-info">
                    <div className="recent-file-name" title={file.name}>
                      {file.name}
                    </div>
                    <div className="recent-file-meta">
                      <span className="recent-file-size">{formatFileSize(file.size)}</span>
                      <span className="recent-file-date">{formatDate(file.lastOpened)}</span>
                    </div>
                  </div>
                  <button
                    className="recent-file-remove"
                    onClick={(e) => handleRemoveRecent(file.id, e)}
                    title="Remove from recent files"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drag and Drop Indicator */}
        <div className="drag-drop-zone">
          <div className="drag-drop-content">
            <FolderOpen size={32} className="drag-drop-icon" />
            <p className="drag-drop-text">
              Drop a markdown file here or click "Open File" to get started
            </p>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      {dragActive && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <FolderOpen size={48} />
            <p>Drop your markdown file here</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default WelcomeScreen 