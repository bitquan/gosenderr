import React from 'react'

interface Props { message: string; variant?: 'info' | 'error' | 'success' }

export default function StatusBanner({ message, variant = 'info' }: Props) {
  const bg = variant === 'error' ? 'bg-red-50 border-red-200 text-red-700' : variant === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700'
  return (
    <div role="status" aria-live="polite" className={`p-3 rounded-lg border ${bg} text-sm`}>{message}</div>
  )
}
