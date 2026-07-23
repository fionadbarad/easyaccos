'use client'

import Link from 'next/link'

interface NavItemProps {
  href: string
  label: string
  Icon: React.ElementType
  active: boolean
  onClick?: () => void
}

/**
 * NavItem Component
 *
 * Refactored to use Tailwind CSS instead of inline styles.
 * This is the professional standard for modern React applications.
 */
export default function NavItem({ href, label, Icon, active, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-[9px] px-3 py-2 rounded-sm no-underline transition-all duration-150 ease-in-out
        text-[0.875rem] tracking-[-0.005em] border-l-2
        ${
          active
            ? 'bg-[rgba(244,245,248,0.08)] text-white border-white font-medium'
            : 'text-[rgba(244,245,248,0.55)] border-transparent font-normal hover:text-white hover:bg-[rgba(244,245,248,0.03)]'
        }
      `}
    >
      <Icon size={15} className={`shrink-0 ${active ? 'stroke-[2px]' : 'stroke-[1.5px]'}`} />
      <span>{label}</span>
    </Link>
  )
}
