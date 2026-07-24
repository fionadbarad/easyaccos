// Lightweight markdown renderer for advisor replies — handles bold, inline
// code, currency/percentage highlighting, headings, and bullet/numbered lists.
// Deliberately minimal; the advisor output is constrained to this subset.

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|£[\d,]+(?:\.\d{2})?%?|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#F4F5F8', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('£') || (/^[\d,]+%$/.test(part) && part.length < 8)) {
      return (
        <span
          key={i}
          style={{
            color: '#4ADE80',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontWeight: 500,
          }}
        >
          {part}
        </span>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          style={{
            background: 'rgba(244,245,248,0.08)',
            borderRadius: '3px',
            padding: '1px 5px',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let listItems: string[] = []

  function flushList() {
    if (listItems.length === 0) return
    nodes.push(
      <ul
        key={nodes.length}
        style={{ margin: '0.35rem 0', paddingLeft: '1.1rem', listStyle: 'none' }}
      >
        {listItems.map((item, i) => (
          <li
            key={i}
            style={{
              color: 'var(--sa-white)',
              fontSize: '0.9375rem',
              lineHeight: 1.75,
              position: 'relative',
              paddingLeft: '0.75rem',
            }}
          >
            <span style={{ position: 'absolute', left: 0, color: 'rgba(244,245,248,0.35)' }}>
              ·
            </span>
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    )
    listItems = []
  }

  for (const line of lines) {
    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2))
    } else if (/^\d+\.\s/.test(line)) {
      listItems.push(line.replace(/^\d+\.\s/, ''))
    } else {
      flushList()
      if (line.startsWith('## ')) {
        nodes.push(
          <p
            key={nodes.length}
            style={{
              color: 'rgba(244,245,248,0.5)',
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-geist-mono), monospace',
              margin: '0.75rem 0 0.25rem',
              fontWeight: 600,
            }}
          >
            {line.slice(3)}
          </p>,
        )
      } else if (line.startsWith('# ')) {
        nodes.push(
          <p
            key={nodes.length}
            style={{
              color: 'var(--sa-white)',
              fontSize: '1rem',
              fontWeight: 600,
              margin: '0.75rem 0 0.25rem',
              letterSpacing: '-0.02em',
            }}
          >
            {line.slice(2)}
          </p>,
        )
      } else if (line.trim()) {
        nodes.push(
          <p
            key={nodes.length}
            style={{
              color: 'var(--sa-white)',
              fontSize: '0.9375rem',
              lineHeight: 1.75,
              margin: '0.2rem 0',
            }}
          >
            {renderInline(line)}
          </p>,
        )
      } else {
        nodes.push(<div key={nodes.length} style={{ height: '0.4rem' }} />)
      }
    }
  }
  flushList()
  return <>{nodes}</>
}
