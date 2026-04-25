'use client'

import { useEffect } from 'react'
import { migrateStorageKeys } from '@/lib/storage/migrateStorageKeys'

export default function StorageMigration() {
  useEffect(() => { migrateStorageKeys() }, [])
  return null
}
