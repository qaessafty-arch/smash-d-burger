// Database types generated from schema
export type UserRole = 'customer' | 'staff' | 'admin'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
export type OrderType = 'delivery' | 'pickup'
export type LoyaltyTierName = 'bronze' | 'silver' | 'gold' | 'platinum'
export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'expired' | 'bonus' | 'referral' | 'birthday'
export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'whatsapp'
export type Language = 'EN' | 'KU' | 'AR'

export interface User {
  id: string
  email: string | null
  phone: string
  name: string
  language: Language
  role: UserRole
  email_verified_at: string | null
  phone_verified_at: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
  is_active: boolean
  referral_code: string | null
  referred_by: string | null
  total_orders: number
  total_spent: number
  loyalty_points: number
  loyalty_tier: LoyaltyTierName
}

export interface UserAddress {
  id: string
  user_id: string
  label: string
  street: string
  neighborhood: string | null
  building: string | null
  floor: string | null
  apartment: string | null
  latitude: number | null
  longitude: number | null
  is_default: boolean
  delivery_instructions: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name_en: string
  name_ku: string
  name_ar: string
  description_en: string | null
  description_ku: string | null
  description_ar: string | null
  image_url: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  category_id: string
  name_en: string
  name_ku: string
  name_ar: string
  description_en: string | null
  description_ku: string | null
  description_ar: string | null
  base_price: number
  image_url: string | null
  badge_en: string | null
  badge_ku: string | null
  badge_ar: string | null
  is_spicy: boolean
  is_vegetarian: boolean
  is_vegan: boolean
  is_active: boolean
  display_order: number
  preparation_time_minutes: number
  calories: number | null
  allergens: string[] | null
  ingredients_json: MenuItemIngredient[]
  created_at: string
  updated_at: string
}

export interface MenuItemIngredient {
  name: string
  removable: boolean
  default_included: boolean
}

export interface InventoryItem {
  id: string
  menu_item_id: string
  current_stock: number
  low_stock_threshold: number
  max_stock: number
  unit: string
  last_restocked_at: string | null
  last_restocked_by: string | null
  auto_reorder: boolean
  reorder_quantity: number
  created_at: string
  updated_at: string
}

export interface InventoryAdjustment {
  id: string
  inventory_item_id: string
  adjustment_type: 'restock' | 'deduct' | 'waste' | 'return' | 'correction'
  quantity_change: number
  previous_stock: number
  new_stock: number
  reason: string | null
  reference_id: string | null
  reference_type: 'order' | 'manual' | 'waste' | 'return' | null
  adjusted_by: string | null
  created_at: string
}

export interface CartItem {
  id: string
  user_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  total_price: number
  removed_ingredients: string[]
  added_extras: CartItemExtra[]
  sauce_level: string | null
  special_instructions: string | null
  created_at: string
  updated_at: string
}

export interface CartItemExtra {
  id: string
  name: string
  price: number
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  status: OrderStatus
  order_type: OrderType
  subtotal: number
  delivery_fee: number
  discount_amount: number
  loyalty_points_used: number
  loyalty_points_earned: number
  total: number
  customer_name: string
  customer_phone: string
  delivery_address: DeliveryAddress | null
  pickup_location: string
  special_instructions: string | null
  estimated_ready_at: string | null
  confirmed_at: string | null
  preparing_at: string | null
  ready_at: string | null
  out_for_delivery_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  whatsapp_sent_at: string | null
  payment_method: PaymentMethod
  payment_status: string
  created_at: string
  updated_at: string
}

export interface DeliveryAddress {
  street: string
  neighborhood: string
  building?: string
  floor?: string
  apartment?: string
  lat?: number
  lng?: number
  instructions?: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string | null
  name_snapshot_en: string
  name_snapshot_ku: string | null
  name_snapshot_ar: string | null
  unit_price: number
  quantity: number
  total_price: number
  removed_ingredients: string[]
  added_extras: CartItemExtra[]
  sauce_level: string | null
  special_instructions: string | null
  created_at: string
}

export interface LoyaltyTier {
  id: string
  name: LoyaltyTierName
  min_points: number
  points_multiplier: number
  benefits_json: LoyaltyTierBenefits
  color: string
  icon: string
  created_at: string
  updated_at: string
}

export interface LoyaltyTierBenefits {
  welcome_discount: number
  birthday_bonus: number
  free_delivery_threshold: number | null
  priority_support?: boolean
  exclusive_items?: boolean
}

export interface LoyaltyTransaction {
  id: string
  user_id: string
  order_id: string | null
  points: number
  transaction_type: LoyaltyTransactionType
  description: string | null
  metadata: Record<string, unknown>
  expires_at: string | null
  created_at: string
}

export interface Review {
  id: string
  user_id: string
  order_id: string | null
  menu_item_id: string | null
  stars: number
  comment: string | null
  favorite_item: string | null
  is_verified_purchase: boolean
  is_published: boolean
  moderation_status: 'pending' | 'approved' | 'rejected'
  moderated_by: string | null
  moderated_at: string | null
  helpful_count: number
  created_at: string
  updated_at: string
}

export interface AnalyticsEvent {
  id: string
  user_id: string | null
  session_id: string | null
  event_name: string
  properties: Record<string, unknown>
  page_url: string | null
  referrer: string | null
  user_agent: string | null
  ip_hash: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown>
  read_at: string | null
  sent_via: string[]
  created_at: string
}

export interface BusinessSetting {
  key: string
  value: unknown
  description: string | null
  updated_at: string
  updated_by: string | null
}

// View types
export interface ActiveMenuWithStock extends MenuItem {
  category_name_en: string
  category_name_ku: string
  category_name_ar: string
  current_stock: number
  low_stock_threshold: number
  stock_status: 'sold_out' | 'low_stock' | 'limited' | 'in_stock'
}

export interface OrderSummary extends Order {
  customer_name: string
  customer_phone: string
  customer_email: string | null
  item_count: number
  total_quantity: number
}

export interface DailyRevenue {
  date: string
  order_count: number
  revenue: number
  avg_order_value: number
  delivery_orders: number
  pickup_orders: number
}

export interface TopSellingItem {
  id: string
  name_en: string
  name_ku: string
  name_ar: string
  base_price: number
  total_sold: number
  total_revenue: number
  order_count: number
}