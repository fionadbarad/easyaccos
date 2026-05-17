import { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <section className={`ui-card ${className}`}>
      {title && <h3 className="ui-card-title">{title}</h3>}
      <div className="ui-card-body">{children}</div>
    </section>
  )
}
