import { ReactNode } from 'react'
import { BottomNav, runnerNavItems } from '../components/BottomNav'

interface RunnerLayoutProps {
  children: ReactNode
}

export default function RunnerLayout({ children }: RunnerLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="pb-24">
        {children}
      </div>
      <BottomNav items={runnerNavItems} />
    </div>
  )
}
