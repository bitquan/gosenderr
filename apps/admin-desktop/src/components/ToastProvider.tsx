import { createContext, useContext, useMemo, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const createToastId = () => {
  const cryptoObj = globalThis.crypto
  if (cryptoObj?.randomUUID) {
    return `toast_${cryptoObj.randomUUID()}`
  }
  if (!cryptoObj?.getRandomValues) {
    throw new Error('Secure random generator unavailable')
  }
  const bytes = new Uint32Array(2)
  cryptoObj.getRandomValues(bytes)
  const suffix = Array.from(bytes, (value) => value.toString(36)).join('')
  return `toast_${suffix}`
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = createToastId()
    setToasts((prev: Toast[]) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev: Toast[]) => prev.filter((t: Toast) => t.id !== id))
    }, 3000)
  }

  const value = useMemo(() => ({ showToast }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast: Toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-semibold text-white ${
              toast.type === 'success'
                ? 'bg-green-600'
                : toast.type === 'error'
                  ? 'bg-red-600'
                  : 'bg-gray-900'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
