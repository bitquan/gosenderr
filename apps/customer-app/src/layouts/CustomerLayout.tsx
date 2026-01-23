import { ReactNode } from 'react'

interface CustomerLayoutProps {
  children: ReactNode
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      {children}
    </div>
  )
}
