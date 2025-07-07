import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

// Extract headers from markdown content
const extractHeaders = (content) => {
  if (!content) return []
  
  const headerRegex = /^#{1,6}\s+(.+)$/gm
  const headers = []
  let match
  
  while ((match = headerRegex.exec(content)) !== null) {
    const level = match[0].indexOf(' ')
    const text = match[1].trim()
    const id = createSlug(text)
    
    headers.push({
      level,
      text,
      id,
      line: match.index
    })
  }
  
  return headers
}

// Create slug from text (same as App.jsx)
const createSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// Build hierarchical structure from flat headers
const buildHierarchy = (headers) => {
  const result = []
  const stack = []
  
  headers.forEach(header => {
    const item = {
      ...header,
      children: []
    }
    
    // Find the appropriate parent
    while (stack.length > 0 && stack[stack.length - 1].level >= header.level) {
      stack.pop()
    }
    
    if (stack.length === 0) {
      result.push(item)
    } else {
      stack[stack.length - 1].children.push(item)
    }
    
    stack.push(item)
  })
  
  return result
}

// Get all header IDs in a flat array
const getAllHeaderIds = (hierarchy) => {
  const ids = []
  const traverse = (items) => {
    items.forEach(item => {
      ids.push(item.id)
      if (item.children.length > 0) {
        traverse(item.children)
      }
    })
  }
  traverse(hierarchy)
  return ids
}

// Header item component
const HeaderItem = ({ header, collapsedSections, onToggleSection, onNavigate, activeId }) => {
  const isCollapsed = collapsedSections.has(header.id)
  const hasChildren = header.children && header.children.length > 0
  const isActive = activeId === header.id
  
  const handleToggle = (e) => {
    e.stopPropagation()
    onToggleSection(header.id)
  }
  
  const handleNavigate = () => {
    onNavigate(header.id)
  }
  
  return (
    <div className="outline-item">
      <div 
        className={`outline-header outline-header-${header.level} ${isActive ? 'active' : ''}`}
        onClick={handleNavigate}
      >
        {hasChildren && (
          <button 
            className="outline-toggle"
            onClick={handleToggle}
            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${header.text}`}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
        {!hasChildren && <span className="outline-spacer" />}
        <span className="outline-text">{header.text}</span>
      </div>
      
      {hasChildren && !isCollapsed && (
        <div className="outline-children">
          {header.children.map((child, index) => (
            <HeaderItem
              key={`${child.id}-${index}`}
              header={child}
              collapsedSections={collapsedSections}
              onToggleSection={onToggleSection}
              onNavigate={onNavigate}
              activeId={activeId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Main outline sidebar component
const OutlineSidebar = ({ content, isVisible, onToggle, onWidthChange }) => {
  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [outline, setOutline] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [headerIds, setHeaderIds] = useState([])
  
  // State for resizing
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('documentViewerOutlineWidth')
    return saved ? parseInt(saved) : 280
  })
  const [isResizing, setIsResizing] = useState(false)
  
  // Extract and build outline when content changes
  useEffect(() => {
    const headers = extractHeaders(content)
    const hierarchy = buildHierarchy(headers)
    setOutline(hierarchy)
    setHeaderIds(getAllHeaderIds(hierarchy))
  }, [content])
  
  // Track active section based on scroll position
  useEffect(() => {
    if (!isVisible || headerIds.length === 0) return
    
    const handleScroll = () => {
      let currentActiveId = null
      
      // Use the CSS variable for consistent header height
      const rootStyles = getComputedStyle(document.documentElement)
      const stickyHeaderHeight = parseInt(rootStyles.getPropertyValue('--sticky-header-height')) || 92
      
      // Find the header that's currently in view
      for (const id of headerIds) {
        const element = document.getElementById(id)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= stickyHeaderHeight + 20 && rect.top > -rect.height) {
            currentActiveId = id
            break
          }
        }
      }
      
      // If no header is in the top portion, find the last one above viewport
      if (!currentActiveId) {
        for (let i = headerIds.length - 1; i >= 0; i--) {
          const id = headerIds[i]
          const element = document.getElementById(id)
          if (element) {
            const rect = element.getBoundingClientRect()
            if (rect.top < stickyHeaderHeight + 20) {
              currentActiveId = id
              break
            }
          }
        }
      }
      
      if (currentActiveId !== activeId) {
        setActiveId(currentActiveId)
      }
    }
    
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isVisible, headerIds, activeId])
  
  const toggleSection = (id) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }
  
  const navigateToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      // Use CSS variable for consistent offset
      const rootStyles = getComputedStyle(document.documentElement)
      const stickyHeaderHeight = parseInt(rootStyles.getPropertyValue('--sticky-header-height')) || 92
      
      const yOffset = -stickyHeaderHeight
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      
      window.scrollTo({ 
        top: y,
        behavior: 'smooth'
      })
      
      // Close sidebar on mobile after navigation
      if (window.innerWidth <= 768) {
        setTimeout(() => onToggle(), 300)
      }
    }
  }
  
  // Handle clicks outside sidebar on mobile
  useEffect(() => {
    if (!isVisible || window.innerWidth > 768) return
    
    const handleClickOutside = (e) => {
      const sidebar = document.querySelector('.outline-sidebar')
      if (sidebar && !sidebar.contains(e.target)) {
        onToggle()
      }
    }
    
    // Add slight delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isVisible, onToggle])
  
  // Handle resize functionality
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsResizing(true)
    document.body.classList.add('resizing-outline')
  }, [])
  
  useEffect(() => {
    if (!isResizing) return
    
    const handleMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX
      const minWidth = 200
      const maxWidth = 600
      
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      setSidebarWidth(clampedWidth)
      
      // Update parent component
      if (onWidthChange) {
        onWidthChange(clampedWidth)
      }
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.classList.remove('resizing-outline')
      // Save to localStorage
      localStorage.setItem('documentViewerOutlineWidth', sidebarWidth.toString())
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.classList.remove('resizing-outline')
    }
  }, [isResizing, sidebarWidth, onWidthChange])
  
  // Update parent on mount and width changes
  useEffect(() => {
    if (onWidthChange && isVisible) {
      onWidthChange(sidebarWidth)
    }
  }, [sidebarWidth, isVisible, onWidthChange])
  
  return (
    <>
      {/* Mobile overlay */}
      {window.innerWidth <= 768 && (
        <div 
          className={`outline-overlay ${isVisible ? 'visible' : ''}`}
          onClick={onToggle}
        />
      )}
      
      <div 
        className={`outline-sidebar ${isVisible ? 'visible' : ''} ${isResizing ? 'resizing' : ''}`}
        style={{ 
          transform: `translateX(${isVisible ? 0 : '100%'})`,
          transition: isResizing ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: window.innerWidth > 768 ? `${sidebarWidth}px` : '100%'
        }}
      >
        {/* Resize handle for desktop */}
        {window.innerWidth > 768 && (
          <div 
            className="outline-resize-handle"
            onMouseDown={handleMouseDown}
          />
        )}
        
        <div className="outline-header-bar">
          <h3 className="outline-title">Outline</h3>
          <button 
            className="outline-close"
            onClick={onToggle}
            aria-label="Close outline"
          >
            ×
          </button>
        </div>
        
        <div className="outline-content">
          {outline.length === 0 ? (
            <div className="outline-empty">
              No headers found in the document
            </div>
          ) : (
            <div className="outline-tree">
              {outline.map((header, index) => (
                <HeaderItem
                  key={`${header.id}-${index}`}
                  header={header}
                  collapsedSections={collapsedSections}
                  onToggleSection={toggleSection}
                  onNavigate={navigateToSection}
                  activeId={activeId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default OutlineSidebar 