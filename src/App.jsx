import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'

function App() {
  const [handle, setHandle] = useState(null)
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [lastModified, setLastModified] = useState(0)
  const [showSource, setShowSource] = useState(false)
  const previewRef = useRef(null)
  const [savedVisible, setSavedVisible] = useState(false)

  const editor = useEditor({
    editable: true,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
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
      setContent(editor.storage.markdown.getMarkdown())
    },
  })

  const readFile = useCallback(async () => {
    if (!handle) return
    try {
      const file = await handle.getFile()
      if (file.lastModified !== lastModified) {
        const text = await file.text()
        if (window.confirm('File changed externally. Reload?')) {
          const pos = editor?.state.selection.from
          editor?.commands.setContent(text)
          setContent(text)
          setLastModified(file.lastModified)
          requestAnimationFrame(() => {
            if (pos) editor?.commands.setTextSelection(pos)
          })
        } else {
          setLastModified(file.lastModified)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }, [handle, lastModified, editor])

  useEffect(() => {
    const id = setInterval(readFile, 1500)
    return () => clearInterval(id)
  }, [readFile])


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
        setFileName(file.name)
        setLastModified(file.lastModified)
        const text = await file.text()
        setContent(text)
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
    const id = setTimeout(async () => {
      try {
        const writable = await handle.createWritable()
        await writable.write(editor.storage.markdown.getMarkdown())
        await writable.close()
        const file = await handle.getFile()
        setLastModified(file.lastModified)
        setSavedVisible(true)
        setTimeout(() => setSavedVisible(false), 1000)
      } catch (err) {
        console.error(err)
      }
    }, 2000)
    return () => clearTimeout(id)
  }, [content, handle, editor])

  return (
    <div className="app">
      <header className="app-header">
        <div className="file-info">
          <button onClick={openFile} className="btn btn-primary">
            Open File
          </button>
          {fileName && <span className="file-name">{fileName}</span>}
          {savedVisible && <span className="saved-notice">Saved</span>}
        </div>
        <div>
          <button onClick={() => setShowSource((v) => !v)} className="btn">
            {showSource ? 'Hide Source' : 'Show Source'}
          </button>
        </div>
      </header>
      <div className="toolbar">
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
      </div>
      <main className="content">
        <div
          ref={previewRef}
          className={`preview ${showSource ? 'split' : ''}`}
        >
          <div className={`editor-wrapper ${showSource ? 'compact' : ''}`}>
            {editor && (
              <EditorContent
                editor={editor}
                className="doc-editor prose"
              />
            )}
          </div>
        </div>
        {showSource && (
          <pre className="editor-source">
            {content}
          </pre>
        )}
      </main>
    </div>
  )
}

export default App
