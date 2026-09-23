import { z } from 'zod'

// ============================================
// COMMON VALIDATORS
// ============================================
export const uuidSchema = z.string().uuid()
export const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/)
export const languageSchema = z.enum(['EN', 'KU', 'AR'])
export const roleSchema = z.enum(['customer', 'staff', 'admin'])
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'])
export const orderTypeSchema = z.enum(['delivery', 'pickup'])
export const paymentMethodSchema = z.enum(['cash', 'card', 'wallet', 'whatsapp'])
export const loyaltyTierEnumSchema = z.enum(['bronze', 'silver', 'gold', 'platinum'])
export const loyaltyTransactionTypeSchema = z.enum(['earned', 'redeemed', 'expired', 'bonus', 'referral', 'birthday'])
export const adjustmentTypeSchema = z.enum(['restock', 'deduct', 'waste', 'return', 'correction'])

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

// ============================================
// AUTH VALIDATORS
// ============================================
export const registerSchema = z.object({
  phone: phoneSchema,
  name: z.string().min(2).max(100),
  email: z.string().email().optional().nullable(),
  language: languageSchema.default('EN'),
  referral_code: z.string().optional(),
})

export const loginSchema = z.object({
  phone: phoneSchema,
})

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6).regex(/^\d{6}$/),
})

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().nullable(),
  language: languageSchema.optional(),
  avatar_url: z.string().url().optional().nullable(),
})

// ============================================
// ADDRESS VALIDATORS
// ============================================
export const addressSchema = z.object({
  label: z.string().min(1).max(50),
  street: z.string().min(5).max(200),
  neighborhood: z.string().max(100).optional().nullable(),
  building: z.string().max(100).optional().nullable(),
  floor: z.string().max(20).optional().nullable(),
  apartment: z.string().max(20).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  is_default: z.boolean().default(false),
  delivery_instructions: z.string().max(500).optional().nullable(),
})

// ============================================
// MENU VALIDATORS
// ============================================
export const categorySchema = z.object({
  name_en: z.string().min(1).max(100),
  name_ku: z.string().min(1).max(100),
  name_ar: z.string().min(1).max(100),
  description_en: z.string().max(500).optional().nullable(),
  description_ku: z.string().max(500).optional().nullable(),
  description_ar: z.string().max(500).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  display_order: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
})

export const menuItemIngredientSchema = z.object({
  name: z.string().min(1).max(100),
  removable: z.boolean().default(true),
  default_included: z.boolean().default(true),
})

export const menuItemSchema = z.object({
  category_id: uuidSchema,
  name_en: z.string().min(1).max(100),
  name_ku: z.string().min(1).max(100),
  name_ar: z.string().min(1).max(100),
  description_en: z.string().max(500).optional().nullable(),
  description_ku: z.string().max(500).optional().nullable(),
  description_ar: z.string().max(500).optional().nullable(),
  base_price: z.number().int().positive(),
  image_url: z.string().url().optional().nullable(),
  badge_en: z.string().max(50).optional().nullable(),
  badge_ku: z.string().max(50).optional().nullable(),
  badge_ar: z.string().max(50).optional().nullable(),
  is_spicy: z.boolean().default(false),
  is_vegetarian: z.boolean().default(false),
  is_vegan: z.boolean().default(false),
  is_active: z.boolean().default(true),
  display_order: z.number().int().nonnegative().default(0),
  preparation_time_minutes: z.number().int().positive().default(5),
  calories: z.number().int().positive().optional().nullable(),
  allergens: z.array(z.string()).optional().nullable(),
  ingredients_json: z.array(menuItemIngredientSchema).default([]),
})

export const menuItemUpdateSchema = menuItemSchema.partial()

// ============================================
// INVENTORY VALIDATORS
// ============================================
export const inventoryItemSchema = z.object({
  menu_item_id: uuidSchema,
  current_stock: z.number().int().nonnegative().default(0),
  low_stock_threshold: z.number().int().positive().default(5),
  max_stock: z.number().int().positive().default(100),
  unit: z.string().max(20).default('pcs'),
  auto_reorder: z.boolean().default(false),
  reorder_quantity: z.number().int().positive().default(20),
})

export const inventoryAdjustmentSchema = z.object({
  inventory_item_id: uuidSchema,
  adjustment_type: adjustmentTypeSchema,
  quantity_change: z.number().int(),
  reason: z.string().max(500).optional().nullable(),
  reference_id: uuidSchema.optional().nullable(),
  reference_type: z.enum(['order', 'manual', 'waste', 'return']).optional().nullable(),
})

// ============================================
// CART VALIDATORS
// ============================================
export const cartItemExtraSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  price: z.number().int().nonnegative(),
})

export const cartItemSchema = z.object({
  menu_item_id: uuidSchema,
  quantity: z.number().int().positive().default(1),
  removed_ingredients: z.array(z.string()).default([]),
  added_extras: z.array(cartItemExtraSchema).default([]),
  sauce_level: z.string().optional().nullable(),
  special_instructions: z.string().max(500).optional().nullable(),
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
})

// ============================================
// ORDER VALIDATORS
// ============================================
export const deliveryAddressSchema = z.object({
  street: z.string().min(5).max(200),
  neighborhood: z.string().min(1).max(100),
  building: z.string().max(100).optional().nullable(),
  floor: z.string().max(20).optional().nullable(),
  apartment: z.string().max(20).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  instructions: z.string().max(500).optional().nullable(),
})

export const createOrderSchema = z.object({
  order_type: orderTypeSchema,
  customer_name: z.string().min(2).max(100),
  customer_phone: phoneSchema,
  delivery_address: deliveryAddressSchema.optional().nullable(),
  pickup_location: z.string().optional().nullable(),
  special_instructions: z.string().max(500).optional().nullable(),
  loyalty_points_to_use: z.number().int().nonnegative().default(0),
  payment_method: paymentMethodSchema.default('cash'),
  cart_items: z.array(cartItemSchema).min(1),
})

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  cancellation_reason: z.string().max(500).optional().nullable(),
})

export const orderFilterSchema = paginationSchema.extend({
  status: orderStatusSchema.optional(),
  order_type: orderTypeSchema.optional(),
  user_id: uuidSchema.optional(),
  ...dateRangeSchema.shape,
})

// ============================================
// LOYALTY VALIDATORS
// ============================================
export const loyaltyTierSchema = z.object({
  name: loyaltyTierEnumSchema,
  min_points: z.number().int().nonnegative(),
  points_multiplier: z.number().positive().max(10).default(1),
  benefits_json: z.object({
    welcome_discount: z.number().nonnegative().max(100).default(0),
    birthday_bonus: z.number().int().nonnegative().default(0),
    free_delivery_threshold: z.number().int().nonnegative().optional().nullable(),
    priority_support: z.boolean().default(false),
    exclusive_items: z.boolean().default(false),
  }).default({}),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(10).optional(),
})

export const redeemPointsSchema = z.object({
  points: z.number().int().positive(),
  description: z.string().max(200),
})

// ============================================
// REVIEW VALIDATORS
// ============================================
export const createReviewSchema = z.object({
  order_id: uuidSchema.optional().nullable(),
  menu_item_id: uuidSchema.optional().nullable(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
  favorite_item: z.string().max(100).optional().nullable(),
}).refine(data => data.order_id || data.menu_item_id, {
  message: 'Either order_id or menu_item_id is required',
})

export const moderateReviewSchema = z.object({
  moderation_status: z.enum(['approved', 'rejected']),
  moderation_note: z.string().max(500).optional().nullable(),
})

export const reviewFilterSchema = paginationSchema.extend({
  stars: z.number().int().min(1).max(5).optional(),
  menu_item_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  is_verified_purchase: z.boolean().optional(),
  moderation_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  ...dateRangeSchema.shape,
})

// ============================================
// ANALYTICS VALIDATORS
// ============================================
export const analyticsEventSchema = z.object({
  event_name: z.string().min(1).max(100),
  properties: z.record(z.unknown()).default({}),
  page_url: z.string().url().optional().nullable(),
  referrer: z.string().url().optional().nullable(),
  user_agent: z.string().optional().nullable(),
})

// ============================================
// SETTINGS VALIDATORS
// ============================================
export const businessSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
  description: z.string().max(500).optional().nullable(),
})

// ============================================
// TYPE EXPORTS
// ============================================
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type AddressInput = z.infer<typeof addressSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type MenuItemInput = z.infer<typeof menuItemSchema>
export type MenuItemUpdateInput = z.infer<typeof menuItemUpdateSchema>
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>
export type CartItemInput = z.infer<typeof cartItemSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type OrderFilterInput = z.infer<typeof orderFilterSchema>
export type LoyaltyTierInput = z.infer<typeof loyaltyTierSchema>
export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>
export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>
export type ReviewFilterInput = z.infer<typeof reviewFilterSchema>
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>
export type BusinessSettingInput = z.infer<typeof businessSettingSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type DateRangeInput = z.infer<typeof dateRangeSchema>