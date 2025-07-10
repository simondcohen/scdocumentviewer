import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Markdown } from 'tiptap-markdown'
import DiffMatchPatch from 'diff-match-patch'
import { Node, mergeAttributes } from '@tiptap/core'
import { Expand, Shrink, List } from 'lucide-react'
import OutlineSidebar from './components/OutlineSidebar'
// The tiptap-markdown extension now handles tables directly, so no custom parsing needed

// Utility function to smartly unescape markdown that tiptap-markdown over-escapes
const unescapeMarkdown = (markdown) => {
  if (!markdown || typeof markdown !== 'string') return markdown || '';
  
  try {
    // First, preserve actual double backslashes that should remain
    // by temporarily replacing them with a placeholder
    let processed = markdown.replace(/\\\\/g, '\u0000DOUBLEBACKSLASH\u0000');
    
    // Now unescape the unnecessarily escaped characters
    processed = processed
      // Unescape brackets (for wikilinks and regular links)
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')
      // Unescape parentheses
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      // Unescape asterisks (for emphasis)
      .replace(/\\\*/g, '*')
      // Unescape underscores
      .replace(/\\_/g, '_')
      // Unescape backticks
      .replace(/\\`/g, '`')
      // Unescape hash symbols (for headers)
      .replace(/\\#/g, '#')
      // Unescape pipes (for tables)
      .replace(/\\\|/g, '|')
      // Unescape tildes (for strikethrough)
      .replace(/\\~/g, '~')
      // Unescape angle brackets
      .replace(/\\</g, '<')
      .replace(/\\>/g, '>')
      // Unescape curly braces (for templating syntaxes)
      .replace(/\\\{/g, '{')
      .replace(/\\\}/g, '}');
    
    // Restore the actual double backslashes
    processed = processed.replace(/\u0000DOUBLEBACKSLASH\u0000/g, '\\\\');
    
    return processed;
  } catch (error) {
    console.error('Error unescaping markdown:', error);
    // If something goes wrong, return the original to prevent data loss
    return markdown;
  }
}

// Add a helper to ensure consistent markdown processing
const getCleanMarkdown = (editor) => {
  if (!editor) return '';
  try {
    const markdown = editor.storage.markdown.getMarkdown();
    return unescapeMarkdown(markdown);
  } catch (error) {
    console.error('Error getting clean markdown:', error);
    return '';
  }
}

// Utility function to create slug from text
const createSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens and spaces
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
}

// Utility function to ensure unique slug
const ensureUniqueSlug = (baseSlug, existingIds = new Set()) => {
  let slug = baseSlug
  let counter = 1
  
  while (existingIds.has(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }
  
  return slug
}

// Custom Heading extension that adds IDs automatically
const HeadingWithId = Node.create({
  name: 'heading',
  priority: 1000,
  
  addOptions() {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {},
    }
  },

  content: 'inline*',

  group: 'block',

  defining: true,

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false,
      },
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {}
          }
          return {
            id: attributes.id,
          }
        },
      },
    }
  },

  parseHTML() {
    return this.options.levels
      .map((level) => ({
        tag: `h${level}`,
        attrs: { level },
        getAttrs: (node) => {
          const existingId = node.getAttribute('id')
          const textContent = node.textContent || ''
          const baseSlug = createSlug(textContent)
          
          return {
            level,
            id: existingId || (textContent ? baseSlug : null)
          }
        }
      }))
  },

  renderHTML({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level)
    const level = hasLevel ? node.attrs.level : this.options.levels[0]
    
    // Generate ID from content if not present
    let id = node.attrs.id
    if (!id && node.textContent) {
      const existingIds = new Set()
      // Get all existing heading IDs from the document
      const doc = node.doc || node
      if (doc && doc.descendants) {
        doc.descendants((descendant) => {
          if (descendant.type.name === 'heading' && descendant.attrs.id) {
            existingIds.add(descendant.attrs.id)
          }
        })
      }
      
      const baseSlug = createSlug(node.textContent)
      id = ensureUniqueSlug(baseSlug, existingIds)
      
      // Update the node's attributes
      node.attrs.id = id
    }

    const attributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      id: id || undefined
    })

    return [`h${level}`, attributes, 0]
  },

  addCommands() {
    return {
      setHeading: (attributes) => ({ commands }) => {
        return commands.setNode(this.name, attributes)
      },
      toggleHeading: (attributes) => ({ commands }) => {
        return commands.toggleNode(this.name, 'paragraph', attributes)
      },
    }
  },

  addKeyboardShortcuts() {
    return this.options.levels.reduce((items, level) => ({
      ...items,
      [`Mod-Alt-${level}`]: () => this.editor.commands.toggleHeading({ level }),
    }), {})
  },
})

function App() {
  const [handle, setHandle] = useState(null)
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [lastModified, setLastModified] = useState(0)
  const [showSource, setShowSource] = useState(false)
  const previewRef = useRef(null)
  const [savedVisible, setSavedVisible] = useState(false)
  const [reloadingVisible, setReloadingVisible] = useState(false)
  const [mergedVisible, setMergedVisible] = useState(false)
  const debounceTimeoutRef = useRef(null)
  const [lastSavedContent, setLastSavedContent] = useState('')
  const dmpRef = useRef(new DiffMatchPatch())
  
  // New state for editable source view
  const [isEditingSource, setIsEditingSource] = useState(false)
  const [sourceContent, setSourceContent] = useState('')
  const sourceDebounceRef = useRef(null)
  const updateSourceRef = useRef(false) // Flag to prevent infinite loops

  // Width toggle state with localStorage persistence
  const [widthMode, setWidthMode] = useState('document') // Default, will be updated when file opens

  // Outline sidebar state with localStorage persistence
  const [showOutline, setShowOutline] = useState(() => {
    const saved = localStorage.getItem('documentViewerShowOutline')
    return saved === 'true'
  })

  // Outline width state
  const [outlineWidth, setOutlineWidth] = useState(() => {
    const saved = localStorage.getItem('documentViewerOutlineWidth')
    return saved ? parseInt(saved) : 280
  })

  // Word count states
  const [wordCount, setWordCount] = useState(0)
  const [selectionWordCount, setSelectionWordCount] = useState(0)

  // Word counting function
  const countWords = (text) => {
    // Remove extra whitespace and split by whitespace
    const words = text.trim().split(/\s+/)
    return text.trim() === '' ? 0 : words.length
  }

  // Get width preference for a specific file
  const getFileWidthPreference = (fileName) => {
    if (!fileName) return localStorage.getItem('documentViewerDefaultWidth') || 'document'
    
    try {
      const prefs = JSON.parse(localStorage.getItem('documentViewerFilePrefs') || '{}')
      return prefs[fileName]?.widthMode || localStorage.getItem('documentViewerDefaultWidth') || 'document'
    } catch (e) {
      console.error('Error reading file preferences:', e)
      return localStorage.getItem('documentViewerDefaultWidth') || 'document'
    }
  }

  // Save width preference for current file
  const saveFileWidthPreference = (fileName, mode) => {
    if (!fileName) return
    
    try {
      const prefs = JSON.parse(localStorage.getItem('documentViewerFilePrefs') || '{}')
      prefs[fileName] = {
        ...prefs[fileName],
        widthMode: mode,
        lastModified: new Date().toISOString()
      }
      // Keep only last 50 file preferences to prevent unlimited growth
      const entries = Object.entries(prefs)
      if (entries.length > 50) {
        // Sort by lastModified and keep most recent 50
        const sorted = entries.sort((a, b) => 
          new Date(b[1].lastModified || 0) - new Date(a[1].lastModified || 0)
        )
        const kept = Object.fromEntries(sorted.slice(0, 50))
        localStorage.setItem('documentViewerFilePrefs', JSON.stringify(kept))
      } else {
        localStorage.setItem('documentViewerFilePrefs', JSON.stringify(prefs))
      }
    } catch (e) {
      console.error('Error saving file preferences:', e)
    }
  }

  // Save width mode preference to localStorage
  useEffect(() => {
    // Save preference when width changes (but only if we have a file open)
    if (fileName) {
      saveFileWidthPreference(fileName, widthMode)
    }
  }, [widthMode, fileName])

  // Save outline visibility to localStorage
  useEffect(() => {
    localStorage.setItem('documentViewerShowOutline', showOutline.toString())
  }, [showOutline])

  // One-time migration of global preference for existing users
  useEffect(() => {
    const globalPref = localStorage.getItem('documentViewerWidthMode')
    if (globalPref && !localStorage.getItem('documentViewerGlobalMigrated')) {
      // Mark as migrated
      localStorage.setItem('documentViewerGlobalMigrated', 'true')
      // Keep global pref as fallback for new files
      localStorage.setItem('documentViewerDefaultWidth', globalPref)
    }
  }, [])

  // Toggle width mode function
  const toggleWidthMode = () => {
    setWidthMode(current => current === 'document' ? 'full' : 'document')
  }

  // Toggle outline sidebar function
  const toggleOutline = () => {
    setShowOutline(current => !current)
  }

  const editor = useEditor({
    editable: true,
    extensions: [
      StarterKit.configure({
        // Disable the default heading extension since we're using our custom one
        heading: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      // Add our custom heading extension
      HeadingWithId,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'link',
        },
      }),
      Underline,
      Placeholder.configure({ 
        placeholder: 'Start writing or paste markdown...' 
      }),
      // Table extensions
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: '-',
        linkify: true,
        breaks: true,
      }),
    ],
    content: '',
    onUpdate({ editor }) {
      try {
        const markdown = editor.storage.markdown.getMarkdown();
        setContent(markdown);
        
        // Count total words
        const text = editor.state.doc.textContent;
        setWordCount(countWords(text));
        
        // Only update source content if the change didn't come from source view
        if (!updateSourceRef.current && !isEditingSource) {
          // Apply unescaping for the source view as well
          setSourceContent(unescapeMarkdown(markdown));
        }
        updateSourceRef.current = false;
      } catch (error) {
        console.error('Error in editor update:', error);
      }
    },
    onSelectionUpdate({ editor }) {
      const { from, to } = editor.state.selection
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to, ' ')
        setSelectionWordCount(countWords(selectedText))
      } else {
        setSelectionWordCount(0)
      }
    },
  })

  // Handle source view changes with debouncing
  const handleSourceChange = useCallback((e) => {
    const newContent = e.target.value
    setSourceContent(newContent)
    
    // Clear existing timeout
    if (sourceDebounceRef.current) {
      clearTimeout(sourceDebounceRef.current)
    }
    
    // Debounce source updates to TipTap
    sourceDebounceRef.current = setTimeout(() => {
      if (editor && newContent !== content) {
        updateSourceRef.current = true // Prevent feedback loop
        
        // The Markdown extension now handles tables directly
        editor.commands.setContent(newContent)
        setContent(newContent)
      }
    }, 400) // 400ms debounce for typing
  }, [editor, content])

  // Handle source textarea focus/blur
  const handleSourceFocus = useCallback(() => {
    setIsEditingSource(true)
  }, [])

  const handleSourceBlur = useCallback(() => {
    setIsEditingSource(false)
  }, [])

  // Initialize source content when content changes from external sources
  useEffect(() => {
    if (!isEditingSource) {
      setSourceContent(content)
    }
  }, [content, isEditingSource])

  const readFile = useCallback(async () => {
    if (!handle) return
    try {
      const file = await handle.getFile()
      if (file.lastModified !== lastModified) {
        // Debounce rapid file changes
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }

        debounceTimeoutRef.current = setTimeout(async () => {
          try {
            const text = await file.text()
            const pos = editor?.state.selection.from
            const currentText = editor?.storage.markdown.getMarkdown() || ''

            if (currentText !== lastSavedContent) {
              // Merge external changes with local unsaved edits
              const patch = dmpRef.current.patch_make(lastSavedContent, text)
              const [merged] = dmpRef.current.patch_apply(patch, currentText)
              
              // The Markdown extension now handles tables directly
              editor?.commands.setContent(merged)
              
              setContent(merged)
              setSourceContent(merged)
              setMergedVisible(true)
              setTimeout(() => setMergedVisible(false), 1000)
            } else {
              // Show reload indicator when no merge is needed
              setReloadingVisible(true)
              
              // The Markdown extension now handles tables directly
              editor?.commands.setContent(text)
              
              setContent(text)
              setSourceContent(text)
            }

            setLastModified(file.lastModified)
            setLastSavedContent(text) // Store the original file content

            // Restore cursor position
            requestAnimationFrame(() => {
              if (pos) editor?.commands.setTextSelection(pos)
              setTimeout(() => setReloadingVisible(false), 500)
            })
          } catch (err) {
            console.error('Error during auto-reload:', err)
            setReloadingVisible(false)
          }
        }, 200)
      }
    } catch (err) {
      console.error(err)
    }
  }, [handle, lastModified, editor, lastSavedContent])

  useEffect(() => {
    const id = setInterval(readFile, 1500)
    return () => clearInterval(id)
  }, [readFile])

  // Cleanup debounce timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (sourceDebounceRef.current) {
        clearTimeout(sourceDebounceRef.current)
      }
    }
  }, [])

  // Handle link clicks - internal links scroll, external links open with cmd/ctrl+click
  useEffect(() => {
    if (!editor) return;

    const handleLinkClick = (event) => {
      // Check if the clicked element is a link
      const link = event.target.closest('a.link');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Check if it's an internal link (starts with #)
      if (href.startsWith('#')) {
        // Internal link - scroll to element
        event.preventDefault();
        event.stopPropagation();
        
        const targetId = href.substring(1); // Remove the # symbol
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          targetElement.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      } else {
        // External link - only open if cmd/ctrl is held
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          event.stopPropagation();
          window.open(href, '_blank');
        }
      }
    };

    // Get the editor's DOM element
    const editorElement = editor.view.dom;
    
    // Add the click listener
    editorElement.addEventListener('click', handleLinkClick);

    // Cleanup
    return () => {
      editorElement.removeEventListener('click', handleLinkClick);
    };
  }, [editor]);

  const openFile = async () => {
    try {
      const [h] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Markdown Files',
            accept: { 'text/markdown': ['.md', '.markdown', '.mdx'] },
          },
        ],
        multiple: false,
      })
      openWithHandle(h)
    } catch (err) {
      // Don't show error for user cancellation (AbortError)
      if (err.name !== 'AbortError') {
        console.error('Error opening file picker:', err)
        alert(
          'Failed to open file picker.\n\n' +
          'This could be due to browser compatibility issues. ' +
          'Please make sure you\'re using a modern browser that supports the File System Access API.'
        )
      }
    }
  }

  const openWithHandle = useCallback(
    async (h) => {
      if (!h) return
      
      try {
        const permission = await h.requestPermission({ mode: 'read' })
        if (permission !== 'granted') {
          alert(
            'File access permission denied.\n\n' +
            'This app needs permission to read your markdown files to display and edit them. ' +
            'Your files remain completely private and secure on your device - they are never uploaded or shared.\n\n' +
            'To grant permission:\n' +
            '1. Click "Open File" again\n' +
            '2. Select your file\n' +
            '3. Click "Allow" when prompted for permission\n\n' +
            'You can revoke this permission at any time through your browser settings.'
          )
          return
        }
        
        setHandle(h)
        const file = await h.getFile()
        const text = await file.text()
        setFileName(file.name)
        setLastModified(file.lastModified)

        // Restore width preference for this file
        const savedWidth = getFileWidthPreference(file.name)
        setWidthMode(savedWidth)

        setContent(text)
        setSourceContent(text)
        setLastSavedContent(text) // Keep the original file content as-is for comparison

        // The Markdown extension now handles tables directly
        editor?.commands.setContent(text)
      } catch (err) {
        console.error('Error opening file:', err)
        alert(
          'Failed to open file.\n\n' +
          'This could be due to:\n' +
          '• File permission issues\n' +
          '• File system access restrictions\n' +
          '• Browser compatibility issues\n\n' +
          'Please try again or use a different file.'
        )
      }
    },
    [editor]
  )

  useEffect(() => {
    const listener = (e) => {
      openWithHandle(e.detail)
    }
    window.addEventListener('file-open', listener)
    return () => window.removeEventListener('file-open', listener)
  }, [openWithHandle])

  // Check for pending file handle when component mounts
  useEffect(() => {
    if (window.pendingFileHandle) {
      openWithHandle(window.pendingFileHandle);
      window.pendingFileHandle = null; // Clear after processing
    }
  }, [openWithHandle]);

  useEffect(() => {
    if (!editor || !handle) return
    
    // Don't auto-save while actively typing in source view
    if (isEditingSource && sourceDebounceRef.current) return
    
    const id = setTimeout(async () => {
      try {
        // Get the clean markdown content
        const markdownContent = getCleanMarkdown(editor);
        
        // Only proceed if we have content
        if (markdownContent === '' && content !== '') {
          console.error('Failed to get markdown content for save');
          return;
        }
        
        const writable = await handle.createWritable();
        await writable.write(markdownContent);
        await writable.close();
        
        // Verify the save by reading back
        const file = await handle.getFile();
        setLastModified(file.lastModified);
        setLastSavedContent(markdownContent);
        setSavedVisible(true);
        setTimeout(() => setSavedVisible(false), 1000);
      } catch (err) {
        console.error('Save error:', err);
        // You might want to show an error notification here
        // but for now we'll just log it to avoid disrupting the user
      }
    }, 2000)
    return () => clearTimeout(id)
  }, [content, handle, editor, isEditingSource])

  return (
    <div className="app">
      <header className="site-header">
        <div className="app-header">
          <div className="file-info">
            <button onClick={openFile} className="btn btn-primary">
              Open File
            </button>
            {fileName && (
              <div className="file-path-container">
                <span className="file-path" title={handle?.name || fileName}>
                  {fileName}
                </span>
                <span className="word-count">
                  {selectionWordCount > 0 
                    ? `${selectionWordCount} of ${wordCount} words`
                    : `${wordCount} words`}
                </span>
              </div>
            )}
            {savedVisible && <span className="saved-notice">Saved</span>}
            {reloadingVisible && <span className="reload-notice">Reloading...</span>}
            {mergedVisible && <span className="merge-notice">Merged</span>}
          </div>
          <div className="header-actions">
            <button onClick={() => setShowSource((v) => !v)} className="btn">
              {showSource ? 'Rendered View' : 'Source View'}
            </button>
            <button
              onClick={toggleOutline}
              className={`btn outline-toggle-header ${showOutline ? 'active' : ''}`}
              title={showOutline ? 'Hide outline' : 'Show outline'}
            >
              <List size={16} />
              <span className="btn-text">Outline</span>
            </button>
          </div>
        </div>
        <nav className="toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`toolbar-button ${editor?.isActive('bold') ? 'active' : ''}`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`toolbar-button ${editor?.isActive('italic') ? 'active' : ''}`}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`toolbar-button ${editor?.isActive('strike') ? 'active' : ''}`}
        >
          S
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`toolbar-button ${editor?.isActive('heading', { level: 1 }) ? 'active' : ''}`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`toolbar-button ${editor?.isActive('heading', { level: 2 }) ? 'active' : ''}`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`toolbar-button ${editor?.isActive('heading', { level: 3 }) ? 'active' : ''}`}
        >
          H3
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`toolbar-button ${editor?.isActive('bulletList') ? 'active' : ''}`}
        >
          •
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`toolbar-button ${editor?.isActive('orderedList') ? 'active' : ''}`}
        >
          1.
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`toolbar-button ${editor?.isActive('codeBlock') ? 'active' : ''}`}
        >
          {'</>'}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`toolbar-button ${editor?.isActive('code') ? 'active' : ''}`}
        >
          {'<>'}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`toolbar-button ${editor?.isActive('blockquote') ? 'active' : ''}`}
        >
          "
        </button>
        <button
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            } else if (url === '') {
              editor.chain().focus().unsetLink().run();
            }
          }}
          className="toolbar-button"
        >
          Link
        </button>
        <div className="toolbar-separator"></div>
        <button
          onClick={toggleWidthMode}
          className={`toolbar-button width-toggle ${widthMode === 'full' ? 'active' : ''}`}
          title={widthMode === 'document' ? 'Switch to full width' : 'Switch to document width'}
        >
          {widthMode === 'document' ? <Expand size={16} /> : <Shrink size={16} />}
          <span className="toolbar-button-text">
            {widthMode === 'document' ? 'Full Width' : 'Document'}
          </span>
        </button>
        </nav>
      </header>
      <OutlineSidebar
        content={content}
        isVisible={showOutline}
        onToggle={toggleOutline}
        onWidthChange={setOutlineWidth}
      />
      <main className="content">
        <div
          ref={previewRef}
          className={`preview ${showOutline ? 'with-outline' : ''}`}
          style={showOutline ? { marginRight: `${outlineWidth}px` } : undefined}
        >
          {!showSource && (
            <div className={`editor-wrapper ${widthMode === 'full' ? 'full-width' : ''}`}>
              {editor && (
                <EditorContent
                  editor={editor}
                  className="doc-editor prose"
                />
              )}
            </div>
          )}
          {showSource && (
            <div className={`editor-wrapper ${widthMode === 'full' ? 'full-width' : ''}`}>
              <textarea
                className="editor-source-fullscreen"
                value={sourceContent}
                onChange={handleSourceChange}
                onFocus={handleSourceFocus}
                onBlur={handleSourceBlur}
                placeholder="Enter markdown here..."
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
