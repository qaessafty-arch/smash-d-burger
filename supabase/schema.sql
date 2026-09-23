-- Smashed Burger Erbil - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');
CREATE TYPE order_type AS ENUM ('delivery', 'pickup');
CREATE TYPE loyalty_tier_name AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE loyalty_transaction_type AS ENUM ('earned', 'redeemed', 'expired', 'bonus', 'referral', 'birthday');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'wallet', 'whatsapp');

-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  language TEXT DEFAULT 'EN' CHECK (language IN ('EN', 'KU', 'AR')),
  role user_role DEFAULT 'customer',
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id),
  total_orders INTEGER DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier loyalty_tier_name DEFAULT 'bronze'
);

CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  street TEXT NOT NULL,
  neighborhood TEXT,
  building TEXT,
  floor TEXT,
  apartment TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_default BOOLEAN DEFAULT FALSE,
  delivery_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_default ON user_addresses(user_id) WHERE is_default = TRUE;

-- ============================================
-- MENU
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en TEXT NOT NULL,
  name_ku TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ku TEXT,
  description_ar TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name_en TEXT NOT NULL,
  name_ku TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ku TEXT,
  description_ar TEXT,
  base_price BIGINT NOT NULL, -- in IQD
  image_url TEXT,
  badge_en TEXT,
  badge_ku TEXT,
  badge_ar TEXT,
  is_spicy BOOLEAN DEFAULT FALSE,
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  preparation_time_minutes INTEGER DEFAULT 5,
  calories INTEGER,
  allergens TEXT[], -- e.g., ['gluten', 'dairy', 'nuts']
  ingredients_json JSONB DEFAULT '[]', -- array of ingredient objects
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_active ON menu_items(category_id) WHERE is_active = TRUE;

-- ============================================
-- INVENTORY
-- ============================================
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL UNIQUE REFERENCES menu_items(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  max_stock INTEGER DEFAULT 100,
  unit TEXT DEFAULT 'pcs',
  last_restocked_at TIMESTAMPTZ,
  last_restocked_by UUID REFERENCES users(id),
  auto_reorder BOOLEAN DEFAULT FALSE,
  reorder_quantity INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_low_stock ON inventory_items(current_stock) WHERE current_stock <= low_stock_threshold;

-- Inventory adjustments log
CREATE TABLE inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('restock', 'deduct', 'waste', 'return', 'correction')),
  quantity_change INTEGER NOT NULL, -- positive for restock, negative for deduct
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  reference_id UUID, -- order_id or manual
  reference_type TEXT CHECK (reference_type IN ('order', 'manual', 'waste', 'return')),
  adjusted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_adjustments_item ON inventory_adjustments(inventory_item_id);
CREATE INDEX idx_inventory_adjustments_created ON inventory_adjustments(created_at DESC);

-- ============================================
-- CART
-- ============================================
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price BIGINT NOT NULL,
  total_price BIGINT NOT NULL,
  removed_ingredients TEXT[] DEFAULT '{}',
  added_extras JSONB DEFAULT '[]',
  sauce_level TEXT,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, menu_item_id, removed_ingredients, added_extras, sauce_level)
);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status order_status DEFAULT 'pending',
  order_type order_type NOT NULL DEFAULT 'pickup',
  subtotal BIGINT NOT NULL,
  delivery_fee BIGINT DEFAULT 0,
  discount_amount BIGINT DEFAULT 0,
  loyalty_points_used INTEGER DEFAULT 0,
  loyalty_points_earned INTEGER DEFAULT 0,
  total BIGINT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address JSONB, -- {street, neighborhood, building, floor, apartment, lat, lng, instructions}
  pickup_location TEXT DEFAULT 'Gulan St, The Boulevard, Erbil',
  special_instructions TEXT,
  estimated_ready_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  whatsapp_sent_at TIMESTAMPTZ,
  payment_method payment_method DEFAULT 'cash',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name_snapshot_en TEXT NOT NULL,
  name_snapshot_ku TEXT,
  name_snapshot_ar TEXT,
  unit_price BIGINT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price BIGINT NOT NULL,
  removed_ingredients TEXT[] DEFAULT '{}',
  added_extras JSONB DEFAULT '[]',
  sauce_level TEXT,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ============================================
-- LOYALTY
-- ============================================
CREATE TABLE loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name loyalty_tier_name UNIQUE NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  points_multiplier DECIMAL(3, 2) DEFAULT 1.0,
  benefits_json JSONB DEFAULT '{}',
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO loyalty_tiers (name, min_points, points_multiplier, benefits_json, color, icon) VALUES
('bronze', 0, 1.0, '{"welcome_discount": 0, "birthday_bonus": 100, "free_delivery_threshold": null}', '#CD7F32', '🥉'),
('silver', 5000, 1.1, '{"welcome_discount": 5, "birthday_bonus": 500, "free_delivery_threshold": 25000}', '#C0C0C0', '🥈'),
('gold', 20000, 1.25, '{"welcome_discount": 10, "birthday_bonus": 1000, "free_delivery_threshold": 15000, "priority_support": true}', '#FFD700', '🥇'),
('platinum', 50000, 1.5, '{"welcome_discount": 15, "birthday_bonus": 2000, "free_delivery_threshold": 0, "priority_support": true, "exclusive_items": true}', '#E5E4E2', '💎');

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL, -- positive for earned, negative for redeemed
  transaction_type loyalty_transaction_type NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_transactions_user ON loyalty_transactions(user_id, created_at DESC);
CREATE INDEX idx_loyalty_transactions_expires ON loyalty_transactions(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- REVIEWS
-- ============================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  favorite_item TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMPTZ,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_menu_item ON reviews(menu_item_id) WHERE is_published = TRUE;
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

-- ============================================
-- ANALYTICS
-- ============================================
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  sent_via TEXT[] DEFAULT '{}', -- ['push', 'email', 'sms', 'whatsapp']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================
-- SETTINGS
-- ============================================
CREATE TABLE business_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

INSERT INTO business_settings (key, value, description) VALUES
('delivery_fee', '2000', 'Default delivery fee in IQD'),
('free_delivery_threshold', '25000', 'Minimum order for free delivery'),
('min_order_amount', '5000', 'Minimum order amount'),
('max_delivery_distance_km', '15', 'Maximum delivery radius in km'),
('kitchen_open_time', '11:00', 'Kitchen opens at'),
('kitchen_close_time', '00:00', 'Kitchen closes at'),
('friday_open_time', '14:00', 'Friday kitchen opens at'),
('whatsapp_business_number', '9647500000000', 'WhatsApp business number'),
('loyalty_points_per_iqd', '1', 'Points earned per IQD spent'),
('loyalty_points_expiry_months', '12', 'Points expire after months of inactivity'),
('referral_bonus_points', '1000', 'Points for successful referral'),
('tax_rate', '0', 'Tax rate percentage');

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update all users" ON users FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own addresses" ON user_addresses FOR ALL USING (auth.uid() = user_id);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active menu items" ON menu_items FOR SELECT USING (is_active = TRUE);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active categories" ON categories FOR SELECT USING (is_active = TRUE);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can view all orders" ON orders FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin')));
CREATE POLICY "Staff can update orders" ON orders FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin')));

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid()));
CREATE POLICY "Staff can view all order items" ON order_items FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin')));

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage inventory" ON inventory_items FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin')));

ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view adjustments" ON inventory_adjustments FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin')));
CREATE POLICY "Staff can create adjustments" ON inventory_adjustments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin')));

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own loyalty transactions" ON loyalty_transactions FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view loyalty tiers" ON loyalty_tiers FOR SELECT USING (TRUE);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published reviews" ON reviews FOR SELECT USING (is_published = TRUE AND moderation_status = 'approved');
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can moderate reviews" ON reviews FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view analytics" ON analytics_events FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone can insert analytics" ON analytics_events FOR INSERT WITH CHECK (TRUE);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage settings" ON business_settings FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON user_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loyalty_tiers_updated_at BEFORE UPDATE ON loyalty_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON business_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
  seq_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM orders
  WHERE order_number LIKE date_part || '%';

  NEW.order_number := date_part || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_order_number_trigger
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- Update user loyalty stats on order completion
CREATE OR REPLACE FUNCTION update_user_loyalty_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE users
    SET total_orders = total_orders + 1,
        total_spent = total_spent + NEW.total,
        loyalty_points = loyalty_points + NEW.loyalty_points_earned - NEW.loyalty_points_used
    WHERE id = NEW.user_id;

    -- Update loyalty tier based on points
    UPDATE users u
    SET loyalty_tier = lt.name
    FROM loyalty_tiers lt
    WHERE u.id = NEW.user_id
      AND u.loyalty_points >= lt.min_points
      AND lt.min_points = (SELECT MAX(min_points) FROM loyalty_tiers WHERE min_points <= u.loyalty_points);
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_loyalty_on_order_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_user_loyalty_on_order();

-- Deduct inventory on order creation
CREATE OR REPLACE FUNCTION deduct_inventory_on_order()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
BEGIN
  IF NEW.status IN ('confirmed', 'preparing') AND OLD.status = 'pending' THEN
    FOR item_record IN
      SELECT oi.menu_item_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      UPDATE inventory_items
      SET current_stock = GREATEST(0, current_stock - item_record.quantity),
          last_restocked_at = NOW()
      WHERE menu_item_id = item_record.menu_item_id;

      INSERT INTO inventory_adjustments (inventory_item_id, adjustment_type, quantity_change, previous_stock, new_stock, reason, reference_id, reference_type, adjusted_by)
      SELECT id, 'deduct', -item_record.quantity, current_stock + item_record.quantity, current_stock, 'Order ' || NEW.order_number, NEW.id, 'order', NEW.user_id
      FROM inventory_items WHERE menu_item_id = item_record.menu_item_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER deduct_inventory_on_order_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_order();

-- Restore inventory on order cancellation
CREATE OR REPLACE FUNCTION restore_inventory_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    FOR item_record IN
      SELECT oi.menu_item_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      UPDATE inventory_items
      SET current_stock = current_stock + item_record.quantity
      WHERE menu_item_id = item_record.menu_item_id;

      INSERT INTO inventory_adjustments (inventory_item_id, adjustment_type, quantity_change, previous_stock, new_stock, reason, reference_id, reference_type, adjusted_by)
      SELECT id, 'return', item_record.quantity, current_stock - item_record.quantity, current_stock, 'Cancelled order ' || NEW.order_number, NEW.id, 'order', NEW.user_id
      FROM inventory_items WHERE menu_item_id = item_record.menu_item_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER restore_inventory_on_cancellation_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION restore_inventory_on_cancellation();

-- ============================================
-- VIEWS
-- ============================================

-- Active menu with stock info
CREATE VIEW active_menu_with_stock AS
SELECT
  mi.*,
  c.name_en AS category_name_en,
  c.name_ku AS category_name_ku,
  c.name_ar AS category_name_ar,
  COALESCE(ii.current_stock, 0) AS current_stock,
  ii.low_stock_threshold,
  CASE
    WHEN COALESCE(ii.current_stock, 0) <= 0 THEN 'sold_out'
    WHEN COALESCE(ii.current_stock, 0) <= ii.low_stock_threshold THEN 'low_stock'
    WHEN COALESCE(ii.current_stock, 0) <= ii.low_stock_threshold * 2 THEN 'limited'
    ELSE 'in_stock'
  END AS stock_status
FROM menu_items mi
JOIN categories c ON mi.category_id = c.id
LEFT JOIN inventory_items ii ON mi.id = ii.menu_item_id
WHERE mi.is_active = TRUE AND c.is_active = TRUE;

-- Order summary for dashboard
CREATE VIEW order_summary AS
SELECT
  o.*,
  u.name AS customer_name,
  u.phone AS customer_phone,
  u.email AS customer_email,
  COUNT(oi.id) AS item_count,
  SUM(oi.quantity) AS total_quantity
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, u.id;

-- Daily revenue
CREATE VIEW daily_revenue AS
SELECT
  DATE(created_at AT TIME ZONE 'Asia/Baghdad') AS date,
  COUNT(*) AS order_count,
  SUM(total) AS revenue,
  AVG(total) AS avg_order_value,
  SUM(CASE WHEN order_type = 'delivery' THEN 1 ELSE 0 END) AS delivery_orders,
  SUM(CASE WHEN order_type = 'pickup' THEN 1 ELSE 0 END) AS pickup_orders
FROM orders
WHERE status = 'delivered'
GROUP BY DATE(created_at AT TIME ZONE 'Asia/Baghdad')
ORDER BY date DESC;

-- Top selling items
CREATE VIEW top_selling_items AS
SELECT
  mi.id,
  mi.name_en,
  mi.name_ku,
  mi.name_ar,
  mi.base_price,
  SUM(oi.quantity) AS total_sold,
  SUM(oi.total_price) AS total_revenue,
  COUNT(DISTINCT oi.order_id) AS order_count
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'delivered'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY mi.id, mi.name_en, mi.name_ku, mi.name_ar, mi.base_price
ORDER BY total_sold DESC;

-- ============================================
-- REALTIME PUBLICATIONS
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;

-- Set REPLICA IDENTITY for tables to get full row on updates
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE inventory_items REPLICA IDENTITY FULL;
ALTER TABLE reviews REPLICA IDENTITY FULL;