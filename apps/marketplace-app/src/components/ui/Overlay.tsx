import { ReactNode, useEffect } from 'react'

export type OverlayVariant = 'modal' | 'sheet' | 'fullscreen' | 'drawer'

interface OverlayProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  variant?: OverlayVariant
  closeOnBackdrop?: boolean
  backdropClassName?: string
  panelClassName?: string
  containerClassName?: string
}

export function Overlay({
  isOpen,
  onClose,
  children,
  variant = 'modal',
  closeOnBackdrop = true,
  backdropClassName,
  panelClassName,
  containerClassName,
}: OverlayProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const containerStyles: Record<OverlayVariant, string> = {
    modal: 'flex items-center justify-center p-4',
    sheet: 'flex items-end md:items-center justify-center',
    fullscreen: 'flex items-center justify-center',
    drawer: 'flex items-stretch justify-end',
  }

  const panelStyles: Record<OverlayVariant, string> = {
    modal: 'bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto',
    sheet: 'bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl max-h-[85vh] overflow-y-auto',
    fullscreen: 'relative w-full h-full flex items-center justify-center',
    drawer: 'bg-white shadow-xl w-full max-w-md h-full',
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 ${backdropClassName || 'bg-black/40'}`}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div className={`relative w-full h-full ${containerStyles[variant]} ${containerClassName || ''}`}>
        <div
          className={`${panelStyles[variant]} ${panelClassName || ''}`}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
