import { ReactNode } from 'react'

interface RunnerLayoutProps {
  children: ReactNode
}

export default function RunnerLayout({ children }: RunnerLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
