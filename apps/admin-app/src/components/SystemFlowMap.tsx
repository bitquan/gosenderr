import React from 'react'

type Props = {
  entries?: any[]
}

export default function SystemFlowMap({ entries = [] }: Props) {
  return (
    <div style={{ padding: 12, border: '1px dashed #ccc' }}>
      <strong>SystemFlowMap</strong>
      <div>Placeholder map for {entries.length} entries</div>
    </div>
  )
}
