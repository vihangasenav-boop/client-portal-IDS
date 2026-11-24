'use client'

interface TopbarProps {
  title: string
  action?: React.ReactNode
}

export function Topbar({ title, action }: TopbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-200 grid grid-cols-[1fr_auto_1fr] items-center pl-20 pr-6 flex-shrink-0">
      <span className="text-sm font-bold text-gray-800">
        HospitalityDCP
      </span>
      <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
        {title}
      </span>
      <div className="flex justify-end">
        {action}
      </div>
    </header>
  )
}