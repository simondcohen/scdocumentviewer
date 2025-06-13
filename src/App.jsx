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
      StarterKit,
      Link,
      Underline,
      Placeholder.configure({ placeholder: 'Start writing\u2026' }),
      Markdown,
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
      console.error(err)
    }
  }

  const openWithHandle = useCallback(
    async (h) => {
      if (!h) return
      if (await h.requestPermission({ mode: 'read' }) !== 'granted') return
      setHandle(h)
      const file = await h.getFile()
      setFileName(file.name)
      setLastModified(file.lastModified)
      const text = await file.text()
      setContent(text)
      editor?.commands.setContent(text)
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
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
      <header className="p-4 shadow flex justify-between items-center bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={openFile}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
          >
            Open File
          </button>
          {fileName && <span className="font-medium">{fileName}</span>}
          {savedVisible && (
            <span className="text-xs text-gray-500 animate-pulse">Saved</span>
          )}
        </div>
        <div>
          <button
            onClick={() => setShowSource((v) => !v)}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            {showSource ? 'Hide Source' : 'Show Source'}
          </button>
        </div>
      </header>
      <div className="border-b bg-white p-2 flex gap-1 text-sm sticky top-0 z-10">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 rounded ${editor?.isActive('bold') ? 'bg-gray-200' : ''}`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 rounded ${editor?.isActive('italic') ? 'bg-gray-200' : ''}`}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-2 rounded ${editor?.isActive('strike') ? 'bg-gray-200' : ''}`}
        >
          S
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 rounded ${editor?.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 rounded ${editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 rounded ${editor?.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}
        >
          H3
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 rounded ${editor?.isActive('bulletList') ? 'bg-gray-200' : ''}`}
        >
          •
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 rounded ${editor?.isActive('orderedList') ? 'bg-gray-200' : ''}`}
        >
          1.
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-2 rounded ${editor?.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
        >
          {'</>'}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`px-2 rounded ${editor?.isActive('code') ? 'bg-gray-200' : ''}`}
        >
          {'<>'}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 rounded ${editor?.isActive('blockquote') ? 'bg-gray-200' : ''}`}
        >
          "
        </button>
        <button
          onClick={() => editor.chain().focus().setLink({ href: prompt('URL') || '' }).run()}
          className="px-2 rounded"
        >
          Link
        </button>
      </div>
      <main className="flex-1 overflow-hidden flex">
        <div
          ref={previewRef}
          className={`overflow-auto ${showSource ? 'w-1/2 border-r' : 'w-full'} flex justify-center`}
        >
          <div className={`w-full ${showSource ? 'p-4' : 'px-8 py-6'} max-w-4xl mx-auto`}>
            {editor && (
              <EditorContent 
                editor={editor} 
                className="prose prose-slate prose-lg min-h-full w-full max-w-none focus:outline-none" 
              />
            )}
          </div>
        </div>
        {showSource && (
          <pre className="w-1/2 p-4 overflow-auto bg-gray-100 font-mono text-sm">
            {content}
          </pre>
        )}
      </main>
    </div>
  )
}

export default App
