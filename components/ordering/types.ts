import type { LName } from './i18n'

export type Option = { id: number; name: LName; priceDelta: number; isDefault: boolean; available: boolean }
export type Group = { id: number; name: LName; kind: 'single' | 'multi'; required: boolean; min: number; max: number; options: Option[] }
export type MenuItem = {
  id: number; categoryId: number; name: LName; desc: LName; price: number; offerPrice: number | null; offerLabel: string
  image: string; prepMinutes: number | null; badge: string; spicy: boolean; featured: boolean; popular: boolean
  ingredients: string[]; allergens: string[]; available: boolean; groups: Group[]
}
export type Category = { id: number; name: LName; icon: string; items: MenuItem[] }
export type PublicSettings = {
  restaurantName: string; tagline: string; description: string; logoUrl: string; coverUrl: string; currency: string
  taxPercent: number; servicePercent: number; hours: Array<{ day: string; open: string; close: string; closed: boolean }>
  timezone: string; orderingEnabled: boolean; manualTableMode: 'open' | 'waiter_only' | 'off'; requestTypes: string[]
  languages: string[]; whatsapp: string; isOpen: boolean; deliveryEnabled: boolean; notice: string
}
export type TableInfo = { number: string; location: string; trusted: boolean; source: string }
export type CartLine = {
  key: string; itemId: number; quantity: number; optionIds: number[]; instructions: string
  // display snapshot so the tray renders instantly; the server quote is what is charged
  name: LName; optionNames: LName[]; estUnit: number; image: string
}
export type Quote = {
  lines: Array<{ itemId: number; name: string; unitPrice: number; optionsTotal: number; quantity: number; lineTotal: number; options: Array<{ group: string; name: string; delta: number }> }>
  subtotal: number; tax: number; service: number; total: number; estMinutes: number | null
}
