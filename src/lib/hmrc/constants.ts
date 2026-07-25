// HMRC Sandbox Integration Constants
export const HMRC_DEFAULT_PERIOD_START = '2024-04-06'
export const HMRC_DEFAULT_PERIOD_END = '2024-07-05'
export const HMRC_DEFAULT_TURNOVER = '5000'
export const HMRC_DEFAULT_ADMIN_COSTS = '250'
export const HMRC_VAT_DEFAULT_PERIOD_KEY = 'A001'
export const HMRC_VAT_DEFAULT_DUE_SALES = '100.00'
export const HMRC_VAT_DEFAULT_RECLAIMED = '25.00'
export const HMRC_VAT_DEFAULT_TOTAL_SALES = '500'
export const HMRC_VAT_DEFAULT_TOTAL_PURCHASES = '125'

/**
 * HMRC's "Manage authorised applications" service — where a user withdraws the
 * authority they granted us. This is the only way to revoke: HMRC's OAuth
 * exposes no programmatic revocation endpoint. (SEC-10)
 *
 * This is the production service. The sandbox sits on a different host, so set
 * HMRC_MANAGE_AUTHORITY_URL per environment (read server-side in the disconnect
 * route) rather than deriving it — the sandbox hostname is not something to
 * guess at in code. This module is imported by client components, so the env
 * read deliberately lives in the route, not here.
 */
export const MANAGE_AUTHORITY_URL_PROD =
  'https://www.tax.service.gov.uk/applications-manage-authority'
