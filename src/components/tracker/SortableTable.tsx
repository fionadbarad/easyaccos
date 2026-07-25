'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

import { C } from '@/styles/palette'
import { T } from '@/styles/type'
export type ColumnDef<T> = {
  key: string
  header: string
  align?: 'left' | 'right'
  sortable?: boolean
  width?: string | number
  accessor: (row: T) => string | number
  render?: (row: T) => React.ReactNode
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null

export function SortableTable<T extends { id: string }>({
  rows,
  columns,
  initialSort,
  empty,
}: {
  rows: T[]
  columns: ColumnDef<T>[]
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  empty?: React.ReactNode
}) {
  const [sort, setSort] = useState<SortState>(initialSort ?? null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = col.accessor(a)
      const bv = col.accessor(b)
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sort, columns])

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  if (rows.length === 0) {
    return (
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: '3rem',
          textAlign: 'center',
          color: C.muted,
          fontSize: T.body,
        }}
      >
        {empty ?? 'No results.'}
      </div>
    )
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: T.meta }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {columns.map((col) => {
                const active = sort?.key === col.key
                const Icon = !col.sortable
                  ? null
                  : !active
                    ? ChevronsUpDown
                    : sort!.dir === 'asc'
                      ? ArrowUp
                      : ArrowDown
                return (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                    style={{
                      padding: '10px 13px',
                      textAlign: col.align ?? 'left',
                      color: active ? C.white : C.muted,
                      fontWeight: 600,
                      fontSize: T.micro,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      whiteSpace: 'nowrap',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      width: col.width,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        flexDirection: col.align === 'right' ? 'row-reverse' : 'row',
                      }}
                    >
                      {col.header}
                      {Icon && <Icon size={12} style={{ color: active ? C.white : C.dim }} />}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr
                key={row.id}
                style={{
                  borderBottom:
                    idx < sorted.length - 1 ? `1px solid rgba(244,245,248,0.04)` : 'none',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '9px 13px',
                      textAlign: col.align ?? 'left',
                      color: C.white,
                      whiteSpace: col.align === 'right' ? 'nowrap' : undefined,
                    }}
                  >
                    {col.render ? col.render(row) : String(col.accessor(row))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
