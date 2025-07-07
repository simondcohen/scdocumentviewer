import { useState, useEffect, useRef } from 'react'
import { ChevronDown, FileText, Plus, FolderOpen, Save, X } from 'lucide-react'
import { getRecentFiles, formatDate } from '../utils/recentFiles'

const FileMenu = ({ 
  onNew, 
  onOpen, 
  onSave, 
  onSaveAs, 
  onClose,
  hasOpenFile,
  isModified
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [recentFiles, setRecentFiles] = useState([])
  const [showRecentSubmenu, setShowRecentSubmenu] = useState(false)
  const menuRef = useRef(null)
  const recentMenuRef = useRef(null)

  // Load recent files when menu opens
  useEffect(() => {
    if (isOpen) {
      loadRecentFiles()
    }
  }, [isOpen])

  const loadRecentFiles = async () => {
    try {
      const files = await getRecentFiles()
      setRecentFiles(files.slice(0, 5)) // Show only 5 most recent
    } catch (error) {
      console.error('Error loading recent files:', error)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
        setShowRecentSubmenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMenuClick = () => {
    setIsOpen(!isOpen)
    setShowRecentSubmenu(false)
  }

  const handleMenuItemClick = (action) => {
    setIsOpen(false)
    setShowRecentSubmenu(false)
    action()
  }

  const handleRecentHover = () => {
    setShowRecentSubmenu(true)
  }

  const handleRecentLeave = () => {
    // Small delay to allow moving to submenu
    setTimeout(() => {
      if (!recentMenuRef.current?.matches(':hover')) {
        setShowRecentSubmenu(false)
      }
    }, 100)
  }

  const handleOpenRecent = (recentFile) => {
    setIsOpen(false)
    setShowRecentSubmenu(false)
    // Show helpful message then open file picker
    alert(`Please select "${recentFile.name}" from the file picker.\n\nDue to browser security, you need to re-grant access to this file.`)
    onOpen()
  }

  return (
    <div className="file-menu" ref={menuRef}>
      <button 
        className={`file-menu-button ${isOpen ? 'active' : ''}`}
        onClick={handleMenuClick}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span>File</span>
        <ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="file-menu-dropdown">
          <div className="file-menu-items">
            {/* New Document */}
            <button 
              className="file-menu-item"
              onClick={() => handleMenuItemClick(onNew)}
            >
              <div className="menu-item-content">
                <Plus size={16} />
                <span>New</span>
              </div>
              <kbd className="menu-shortcut">⌘N</kbd>
            </button>

            {/* Open File */}
            <button 
              className="file-menu-item"
              onClick={() => handleMenuItemClick(onOpen)}
            >
              <div className="menu-item-content">
                <FolderOpen size={16} />
                <span>Open</span>
              </div>
              <kbd className="menu-shortcut">⌘O</kbd>
            </button>

            <div className="menu-separator"></div>

            {/* Save */}
            <button 
              className={`file-menu-item ${!hasOpenFile || !isModified ? 'disabled' : ''}`}
              onClick={() => hasOpenFile && isModified && handleMenuItemClick(onSave)}
              disabled={!hasOpenFile || !isModified}
            >
              <div className="menu-item-content">
                <Save size={16} />
                <span>Save</span>
              </div>
              <kbd className="menu-shortcut">⌘S</kbd>
            </button>

            {/* Save As */}
            <button 
              className={`file-menu-item ${!hasOpenFile ? 'disabled' : ''}`}
              onClick={() => hasOpenFile && handleMenuItemClick(onSaveAs)}
              disabled={!hasOpenFile}
            >
              <div className="menu-item-content">
                <Save size={16} />
                <span>Save As...</span>
              </div>
              <kbd className="menu-shortcut">⇧⌘S</kbd>
            </button>

            <div className="menu-separator"></div>

            {/* Recent Files */}
            <div 
              className="file-menu-item submenu-trigger"
              onMouseEnter={handleRecentHover}
              onMouseLeave={handleRecentLeave}
            >
              <div className="menu-item-content">
                <FileText size={16} />
                <span>Recent Files</span>
              </div>
              <ChevronDown size={14} className="submenu-arrow" />
              
              {showRecentSubmenu && (
                <div 
                  className="file-menu-submenu"
                  ref={recentMenuRef}
                  onMouseEnter={() => setShowRecentSubmenu(true)}
                  onMouseLeave={() => setShowRecentSubmenu(false)}
                >
                                     {recentFiles.length > 0 ? (
                     recentFiles.map((file) => (
                       <button
                         key={file.id}
                         className="file-menu-item recent-file-item"
                         onClick={() => handleOpenRecent(file)}
                         title={`${file.name} - ${formatDate(file.lastOpened)}`}
                       >
                         <div className="menu-item-content">
                           <FileText size={14} />
                           <span className="recent-file-name">{file.name}</span>
                         </div>
                         <span className="recent-file-date">{formatDate(file.lastOpened)}</span>
                       </button>
                     ))
                   ) : (
                     <div className="file-menu-item disabled">
                       <span>No recent files</span>
                     </div>
                   )}
                </div>
              )}
            </div>

            <div className="menu-separator"></div>

            {/* Close */}
            <button 
              className={`file-menu-item ${!hasOpenFile ? 'disabled' : ''}`}
              onClick={() => hasOpenFile && handleMenuItemClick(onClose)}
              disabled={!hasOpenFile}
            >
              <div className="menu-item-content">
                <X size={16} />
                <span>Close</span>
              </div>
              <kbd className="menu-shortcut">⌘W</kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileMenu 