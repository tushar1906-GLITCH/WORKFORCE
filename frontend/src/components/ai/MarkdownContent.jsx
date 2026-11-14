import React from 'react';

/**
 * Lightweight, zero-dependency Markdown renderer for AI Assistant responses.
 * Renders headings, markdown tables, bold text, code tags, and bulleted lists.
 */
export const MarkdownContent = ({ content }) => {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');
  const elements = [];
  let tableBuffer = [];
  let listBuffer = [];
  let keyIndex = 0;

  const flushTable = () => {
    if (tableBuffer.length === 0) return;

    // First line is headers, second line is divider (---), remaining lines are rows
    const headerLine = tableBuffer[0];
    const headers = headerLine
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const rows = [];
    for (let i = 2; i < tableBuffer.length; i++) {
      const rowCells = tableBuffer[i]
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (rowCells.length > 0) {
        rows.push(rowCells);
      }
    }

    elements.push(
      <div key={`table-${keyIndex++}`} style={{ overflowX: 'auto', margin: '12px 0' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid var(--border-medium)' }}>
              {headers.map((h, hIdx) => (
                <th
                  key={hIdx}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {formatInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                style={{
                  borderBottom: rIdx === rows.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                  backgroundColor: rIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                }}
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    {formatInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );

    tableBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`list-${keyIndex++}`} style={{ paddingLeft: '20px', margin: '8px 0', color: 'var(--text-secondary)' }}>
        {listBuffer.map((item, idx) => (
          <li key={idx} style={{ marginBottom: '4px' }}>
            {formatInline(item)}
          </li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  const formatInline = (text) => {
    if (!text) return '';
    // Format bold: **text**
    const parts = [];
    let remaining = text;
    let inlineKey = 0;

    // Simple parser for **bold** and `code`
    const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
    let match;
    let lastIdx = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.substring(lastIdx, match.index));
      }
      if (match[2]) {
        // Bold
        parts.push(
          <strong key={`b-${inlineKey++}`} style={{ color: 'var(--text-primary)' }}>
            {match[2]}
          </strong>,
        );
      } else if (match[3]) {
        // Code
        parts.push(
          <code
            key={`c-${inlineKey++}`}
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#93C5FD',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '0.85em',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {match[3]}
          </code>,
        );
      }
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.substring(lastIdx));
    }

    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Markdown Table Detection
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      tableBuffer.push(line);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    // Unordered List (- or *)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      listBuffer.push(line.substring(2));
      continue;
    } else if (listBuffer.length > 0) {
      flushList();
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h3-${keyIndex++}`}
          style={{
            color: 'var(--primary)',
            margin: '14px 0 6px 0',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          {formatInline(line.substring(4))}
        </h4>,
      );
      continue;
    }

    if (line.startsWith('#### ')) {
      elements.push(
        <h5
          key={`h4-${keyIndex++}`}
          style={{
            color: 'var(--text-primary)',
            margin: '10px 0 4px 0',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {formatInline(line.substring(5))}
        </h5>,
      );
      continue;
    }

    // Italic / note line
    if (line.startsWith('*(') && line.endsWith(')*')) {
      elements.push(
        <div
          key={`note-${keyIndex++}`}
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            marginTop: '8px',
          }}
        >
          {line.slice(1, -1)}
        </div>,
      );
      continue;
    }

    // Normal paragraph
    if (line.length > 0) {
      elements.push(
        <p key={`p-${keyIndex++}`} style={{ margin: '6px 0', lineHeight: 1.5, color: 'var(--text-primary)' }}>
          {formatInline(line)}
        </p>,
      );
    }
  }

  flushTable();
  flushList();

  return <div className="markdown-container">{elements}</div>;
};

export default MarkdownContent;
