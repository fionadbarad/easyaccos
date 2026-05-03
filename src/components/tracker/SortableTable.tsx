'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

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
    const col = columns.find(c => c.key === sort.key)
    if (!col) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = col.accessor(a)
      const bv = col.accessor(b)
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sort, columns])

  function toggleSort(key: string) {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  if (rows.length === 0) {
    return (
      <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[6px] p-12 text-center text-[rgba(244,245,248,0.42)] text-[0.85rem]">
        {empty ?? 'No results.'}
      </div>
    )
  }

  return (
    <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[6px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.82rem]">
          <thead>
            <tr className="border-b border-[rgba(244,245,248,0.07)]">
              {columns.map(col => {
                const active = sort?.key === col.key
                const Icon = !col.sortable
                  ? null
                  : !active
                    ? ChevronsUpDown
                    : sort!.dir === 'asc' ? ArrowUp : ArrowDown
                return (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                    className={`px-[13px] py-[10px] font-semibold text-[0.62rem] uppercase tracking-[0.07em] whitespace-nowrap select-none ${active ? 'text-[#F4F5F8]' : 'text-[rgba(244,245,248,0.42)]'} ${col.sortable ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{ textAlign: col.align ?? 'left', width: col.width }}
                  >
                    <span className={`inline-flex items-center gap-[5px] ${col.align === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {col.header}
                      {Icon && <Icon size={10} className={active ? 'text-[#F4F5F8]' : 'text-[rgba(244,245,248,0.18)]'} />}
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
                className={idx < sorted.length - 1 ? 'border-b border-[rgba(244,245,248,0.04)]' : ''}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className="px-[13px] py-[9px] text-[#F4F5F8]"
                    style={{ textAlign: col.align ?? 'left', whiteSpace: col.align === 'right' ? 'nowrap' : undefined }}
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
