'use client'

/**
 * Mileage route. Composition only — the logic is in
 * `features/mileage/use-mileage-logic`, the presentation in
 * `features/mileage/components/MileageDashboard`, and the arithmetic in
 * `features/mileage/mileage-model`, which imports no React.
 *
 * WHY THIS IS STILL A CLIENT COMPONENT. The obvious shape for a thin route is
 * a server component that fetches and hands down initial data. It does not work
 * here: mileage entries come from `useUserData`, which serves signed-in users
 * from Supabase and everyone else from AES-GCM-encrypted IndexedDB in the
 * browser. A guest's journeys are decryptable only on their own device, so a
 * server render has nothing to fetch and the "guest" path — a supported way to
 * use this app without an account — would render empty. Moving the fetch to the
 * server means first moving guest storage to the server, which is a product
 * decision, not a refactor.
 */

import { useMileageLogic } from '@/features/mileage/use-mileage-logic'
import { MileageDashboard } from '@/features/mileage/components/MileageDashboard'

export default function MileagePage() {
  return <MileageDashboard {...useMileageLogic()} />
}
