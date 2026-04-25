export const STORAGE_KEYS = {
  FX_RATES:           'ea_fx_rates',
  TRANSACTIONS:       'ea_transactions',
  COOKIE_CONSENT:     'ea_cookie_consent',
  CRYPTO_ONBOARD:     'ea_crypto_onboard_seen_v1',
  INVOICES:           'ea_invoices',
  EXPENSES:           'ea_expenses',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

/** Keys that existed before the ea_ standardisation, mapped to their canonical replacements. */
export const LEGACY_KEY_MAP: Record<string, string> = {
  easyacco_transactions:   STORAGE_KEYS.TRANSACTIONS,
  easyacco_cookie_consent: STORAGE_KEYS.COOKIE_CONSENT,
  easyacco_expenses:       STORAGE_KEYS.EXPENSES,
}
