// Mileage domain types and HMRC 2026/27 constants.

export type VehicleType = 'car' | 'motorcycle' | 'bike'

export interface MileageEntry {
  id: string
  date: string
  description: string
  vehicle: VehicleType
  miles: number
  createdAt: string
}

// HMRC 2026/27 approved mileage rates
export const RATE_CAR_FIRST = 0.45 // First 10,000 miles
export const RATE_CAR_EXCESS = 0.25 // Above 10,000 miles
export const RATE_BIKE = 0.2
export const RATE_MOTORCYCLE = 0.24
export const CAR_THRESHOLD = 10_000

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  car: 'Car / Van',
  motorcycle: 'Motorcycle',
  bike: 'Bicycle',
}

export const MILEAGE_SEED: MileageEntry[] = []
