import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function App() {
  const [handle, setHandle] = useState(null)
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [lastModified, setLastModified] = useState(0)
  const [splitView, setSplitView] = useState(true)
  const previewRef = useRef(null)

  const readFile = useCallback(async () => {
    if (!handle) return
    try {
      const file = await handle.getFile()
      if (file.lastModified !== lastModified) {
        const text = await file.text()
        const container = previewRef.current
        const ratio = container ? container.scrollTop / container.scrollHeight : 0
        setContent(text)
        setLastModified(file.lastModified)
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = ratio * container.scrollHeight
          }
        })
      }
    } catch (err) {
      console.error(err)
    }
  }, [handle, lastModified])

  useEffect(() => {
    const id = setInterval(readFile, 1500)
    return () => clearInterval(id)
  }, [readFile])

  useEffect(() => {
    window.hljs?.highlightAll()
  }, [content, splitView])

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
      if (await h.requestPermission({ mode: 'read' }) !== 'granted') return
      setHandle(h)
      const file = await h.getFile()
      setFileName(file.name)
      setLastModified(file.lastModified)
      setContent(await file.text())
    } catch (err) {
      console.error(err)
    }
  }

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
        </div>
        <div>
          <button
            onClick={() => setSplitView((v) => !v)}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            {splitView ? 'Preview Only' : 'Split View'}
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden flex">
        {splitView && (
          <pre
            className="w-1/2 p-4 overflow-auto border-r bg-gray-100"
            ref={previewRef}
          >
            {content}
          </pre>
        )}
        <div
          ref={!splitView ? previewRef : null}
          className={`${
            splitView ? 'w-1/2' : 'w-full'
          } p-4 overflow-auto prose prose-slate max-w-none`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ children, className }) {
                return (
                  <pre>
                    <code className={className}>{children}</code>
                  </pre>
                )
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </main>
    </div>
  )
}

export default App
