/**
 * Append-only audit log.
 *
 * Every write through the storage facade calls appendAuditLog(). Entries are
 * stored locally in IndexedDB (STORE_AUDIT) and mirrored best-effort to the
 * `audit_logs` Supabase table when the user is authenticated.
 *
 * Schema (Supabase — run once):
 *
 *   CREATE TABLE audit_logs (
 *     id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
 *     entity     text        NOT NULL,
 *     entity_id  text        NOT NULL,
 *     op         text        NOT NULL CHECK (op IN ('create','update','delete')),
 *     before     jsonb,
 *     after      jsonb,
 *     ts         timestamptz NOT NULL DEFAULT now(),
 *     actor      text
 *   );
 *   ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "own_audit" ON audit_logs
 *     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 */

import { isFlagEnabled, FLAG_AUDIT } from './feature-flags'
import { idbSet, STORE_AUDIT, isIDBAvailable, idbAuditRange } from './storage/idb'
import { isSupabaseConfigured, createClient } from './supabase-browser'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditOp = 'create' | 'update' | 'delete'

export interface AuditEntry {
  id: string
  entity: string
  entityId: string
  op: AuditOp
  before: unknown
  after: unknown
  ts: string // ISO
  actor: string | null
}

export async function appendAuditLog(
  entry: Omit<AuditEntry, 'id' | 'ts'>,
  supabase?: SupabaseClient | null,
  userId?: string | null,
): Promise<void> {
  if (!isFlagEnabled(FLAG_AUDIT)) return

  const full: AuditEntry = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    ...entry,
  }

  // Local IDB (authoritative)
  if (isIDBAvailable()) {
    try {
      await idbSet(STORE_AUDIT, full.id, full)
    } catch {
      /* best-effort */
    }
  }

  // Supabase mirror (best-effort, never throws)
  if (supabase && userId && isSupabaseConfigured) {
    void supabase.from('audit_logs').insert({
      id: full.id,
      user_id: userId,
      entity: full.entity,
      entity_id: full.entityId,
      op: full.op,
      before: (full.before as Record<string, unknown>) ?? null,
      after: (full.after as Record<string, unknown>) ?? null,
      ts: full.ts,
      actor: full.actor,
    })
  }
}

export async function readAuditLog(limit = 500): Promise<AuditEntry[]> {
  if (!isFlagEnabled(FLAG_AUDIT)) return []
  return idbAuditRange(limit) as Promise<AuditEntry[]>
}
