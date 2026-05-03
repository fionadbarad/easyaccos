'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'

interface MobileTopBarProps {
  open: boolean
  onToggle: () => void
}

export default function MobileTopBar({ open, onToggle }: MobileTopBarProps) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-[52px] z-40 bg-[#181818] border-b border-[rgba(244,245,248,0.07)] flex items-center justify-between px-4">
      <Link href="/" className="no-underline">
        <span className="text-[#F4F5F8] text-[0.9rem] font-semibold tracking-[-0.03em]">System Auditor</span>
      </Link>
      <button onClick={onToggle} className="bg-transparent border-0 text-[rgba(244,245,248,0.42)] cursor-pointer flex p-1">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>
  )
}
