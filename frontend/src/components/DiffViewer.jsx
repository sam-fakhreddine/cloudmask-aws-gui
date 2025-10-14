import { useMemo } from 'react';

export function DiffViewer({ original, masked }) {
  const diff = useMemo(() => {
    if (!original || !masked) return [];
    
    const lines = [];
    const originalLines = original.split('\n');
    const maskedLines = masked.split('\n');
    const maxLines = Math.max(originalLines.length, maskedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i] || '';
      const maskLine = maskedLines[i] || '';
      
      if (origLine === maskLine) {
        lines.push({ type: 'unchanged', original: origLine, masked: maskLine });
      } else {
        lines.push({ type: 'changed', original: origLine, masked: maskLine });
      }
    }
    
    return lines;
  }, [original, masked]);

  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: '13px',
      border: '1px solid var(--color-border-divider-default)',
      borderRadius: '8px',
      overflow: 'auto',
      maxHeight: '600px'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ 
            background: 'var(--color-background-container-header)',
            borderBottom: '2px solid var(--color-border-divider-default)',
            position: 'sticky',
            top: 0
          }}>
            <th style={{ width: '40px', padding: '8px', textAlign: 'center', borderRight: '1px solid var(--color-border-divider-default)' }}>#</th>
            <th style={{ width: '50%', padding: '8px', textAlign: 'left', borderRight: '1px solid var(--color-border-divider-default)' }}>Original</th>
            <th style={{ width: '50%', padding: '8px', textAlign: 'left' }}>Masked</th>
          </tr>
        </thead>
        <tbody>
          {diff.map((line, i) => (
            <tr key={i} style={{
              background: line.type === 'changed' 
                ? 'var(--color-background-status-warning)' 
                : 'transparent'
            }}>
              <td style={{ 
                padding: '4px 8px', 
                textAlign: 'center',
                color: 'var(--color-text-status-inactive)',
                borderRight: '1px solid var(--color-border-divider-default)',
                userSelect: 'none'
              }}>
                {i + 1}
              </td>
              <td style={{ 
                padding: '4px 8px',
                borderRight: '1px solid var(--color-border-divider-default)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {line.original}
              </td>
              <td style={{ 
                padding: '4px 8px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {line.masked}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
