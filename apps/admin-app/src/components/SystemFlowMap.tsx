import { useEffect, useState } from 'react'
import type { RunLogEntry } from '../pages/SystemCheck'

interface NodeState {
  id: string
  label: string
  status: 'idle' | 'running' | 'success' | 'failed'
}

const initialNodes: NodeState[] = [
  { id: 'auth', label: 'Auth', status: 'idle' },
  { id: 'market', label: 'Marketplace', status: 'idle' },
  { id: 'payments', label: 'Payments', status: 'idle' },
  { id: 'jobs', label: 'Delivery Jobs', status: 'idle' },
  { id: 'notifications', label: 'Notifications', status: 'idle' },
]

export default function SystemFlowMap({ entries }: { entries: RunLogEntry[] }) {
  const [nodes, setNodes] = useState<NodeState[]>(initialNodes)

  useEffect(() => {
    // Simple mapping: when an entry message contains a keyword, set node state
    for (const e of entries) {
      const msg = (e.message || '').toLowerCase()
      if (msg.includes('created buyer') || msg.includes('created seller') || msg.includes('created courier')) {
        setNodes(n => n.map(x => x.id === 'auth' ? { ...x, status: e.message.includes('failed') ? 'failed' : 'success' } : x))
      }
      if (msg.includes('marketplace item')) {
        setNodes(n => n.map(x => x.id === 'market' ? { ...x, status: e.message.includes('failed') ? 'failed' : 'success' } : x))
      }
      if (msg.includes('payment')) {
        setNodes(n => n.map(x => x.id === 'payments' ? { ...x, status: e.message.includes('failed') ? 'failed' : 'success' } : x))
      }
      if (msg.includes('job') || msg.includes('claimed') || msg.includes('completed')) {
        setNodes(n => n.map(x => x.id === 'jobs' ? { ...x, status: e.message.includes('failed') ? 'failed' : 'success' } : x))
      }
      if (msg.includes('notification')) {
        setNodes(n => n.map(x => x.id === 'notifications' ? { ...x, status: e.message.includes('failed') ? 'failed' : 'success' } : x))
      }
      if (e.message && e.message.toLowerCase().includes('starting')) {
        setNodes(n => n.map(x => ({ ...x, status: 'running' })))
      }
    }
  }, [entries])

  return (
    <div className="flex gap-4 items-center">
      {nodes.map(n => (
        <div key={n.id} className={`p-3 rounded border ${n.status === 'idle' ? 'bg-white' : n.status === 'running' ? 'bg-yellow-100' : n.status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
          <div className="text-sm font-semibold">{n.label}</div>
          <div className="text-xs text-gray-600">{n.status}</div>
        </div>
      ))}
    </div>
  )
}
