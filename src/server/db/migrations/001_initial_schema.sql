-- ====================================================================
-- AgroPulse Enterprise Smart Agriculture Platform
-- Production Relational Database Schema (PostgreSQL 14+ / 16+)
-- Migration: 001_initial_schema.sql
-- ====================================================================

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('super_admin', 'farmer', 'farm_worker', 'agronomist', 'buyer', 'supplier', 'support_staff')),
    phone VARCHAR(64),
    district VARCHAR(64),
    organization VARCHAR(255),
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON password_reset_tokens(token_hash);

-- 3. Farms & Agricultural Infrastructure
CREATE TABLE IF NOT EXISTS farms (
    id VARCHAR(64) PRIMARY KEY,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(64) NOT NULL,
    province VARCHAR(64) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    total_area DECIMAL(10, 2) NOT NULL CHECK (total_area > 0),
    area_unit VARCHAR(32) DEFAULT 'acres' CHECK (area_unit IN ('acres', 'hectares', 'sq_meters')),
    soil_primary VARCHAR(64) NOT NULL,
    irrigation_primary VARCHAR(64) NOT NULL,
    assigned_workers TEXT[] DEFAULT '{}',
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farms_owner ON farms(owner_id);
CREATE INDEX IF NOT EXISTS idx_farms_district ON farms(district);

-- 4. Land Plots within Farms
CREATE TABLE IF NOT EXISTS land_plots (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    plot_code VARCHAR(32) NOT NULL,
    area DECIMAL(10, 2) NOT NULL CHECK (area > 0),
    area_unit VARCHAR(32) DEFAULT 'acres' CHECK (area_unit IN ('acres', 'hectares', 'sq_meters')),
    soil_type VARCHAR(64) NOT NULL,
    irrigation_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'fallow' CHECK (status IN ('cultivated', 'fallow', 'preparation', 'resting', 'preparing')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (farm_id, plot_code)
);

CREATE INDEX IF NOT EXISTS idx_plots_farm ON land_plots(farm_id);

-- 5. Crop Cycles & Phenological Tracking
CREATE TABLE IF NOT EXISTS crop_cycles (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    plot_id VARCHAR(64) NOT NULL REFERENCES land_plots(id) ON DELETE RESTRICT,
    crop_name VARCHAR(128) NOT NULL,
    crop_type VARCHAR(128),
    variety VARCHAR(128) NOT NULL,
    category VARCHAR(64) DEFAULT 'Commercial Plantation',
    season VARCHAR(64) NOT NULL,
    start_date DATE NOT NULL,
    expected_harvest_date DATE NOT NULL,
    actual_harvest_date DATE,
    current_stage VARCHAR(64) NOT NULL,
    stage VARCHAR(64),
    target_yield_kg DECIMAL(10, 2) NOT NULL CHECK (target_yield_kg >= 0),
    actual_yield_kg DECIMAL(10, 2) DEFAULT 0 CHECK (actual_yield_kg >= 0),
    status VARCHAR(32) DEFAULT 'in_progress' CHECK (status IN ('planned', 'in_progress', 'completed', 'abandoned', 'active', 'failed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cycles_farm ON crop_cycles(farm_id);
CREATE INDEX IF NOT EXISTS idx_cycles_plot ON crop_cycles(plot_id);

-- 6. Crop Observations & Agronomic Health
CREATE TABLE IF NOT EXISTS crop_observations (
    id VARCHAR(64) PRIMARY KEY,
    crop_cycle_id VARCHAR(64) NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    author_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(32) NOT NULL,
    date DATE NOT NULL,
    stage VARCHAR(64) NOT NULL,
    health_status VARCHAR(32) DEFAULT 'good',
    observation_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL CHECK (severity IN ('low', 'moderate', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_observations_cycle ON crop_observations(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_observations_farm ON crop_observations(farm_id);

-- 7. Farm Tasks & Worker Dispatch
CREATE TABLE IF NOT EXISTS farm_tasks (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    plot_id VARCHAR(64) REFERENCES land_plots(id) ON DELETE SET NULL,
    crop_cycle_id VARCHAR(64) REFERENCES crop_cycles(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(64) NOT NULL,
    priority VARCHAR(32) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
    assigned_to_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(255),
    due_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_farm ON farm_tasks(farm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON farm_tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON farm_tasks(status);

-- 8. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    district VARCHAR(64) NOT NULL,
    address TEXT,
    categories_supplied TEXT[] DEFAULT '{}',
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    rating DECIMAL(2, 1) DEFAULT 4.5,
    payment_terms VARCHAR(64) DEFAULT '30 Days Net',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Transactional Inventory & Supplies
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    current_stock DECIMAL(10, 2) NOT NULL CHECK (current_stock >= 0),
    unit VARCHAR(32) NOT NULL,
    reorder_threshold DECIMAL(10, 2) NOT NULL CHECK (reorder_threshold >= 0),
    min_reorder_level DECIMAL(10, 2) DEFAULT 10,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    cost_per_unit DECIMAL(10, 2) DEFAULT 0,
    location VARCHAR(128) NOT NULL,
    location_storage VARCHAR(128),
    supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE SET NULL,
    status VARCHAR(32) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (farm_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_inventory_farm ON inventory_items(farm_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);

-- 10. Immutable Stock Movements Ledger
CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    inventory_item_id VARCHAR(64) NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    inventory_item_name VARCHAR(255),
    type VARCHAR(32) NOT NULL CHECK (type IN ('received', 'issued', 'adjustment', 'return', 'returned', 'adjusted')),
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    previous_stock DECIMAL(10, 2) NOT NULL CHECK (previous_stock >= 0),
    new_stock DECIMAL(10, 2) NOT NULL CHECK (new_stock >= 0),
    reason TEXT NOT NULL,
    reference_id VARCHAR(64),
    performed_by_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    performed_by_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_mov_item ON stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_mov_farm ON stock_movements(farm_id);

-- 11. Farm Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    crop_cycle_id VARCHAR(64) REFERENCES crop_cycles(id) ON DELETE SET NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(16) DEFAULT 'LKR',
    date DATE NOT NULL,
    vendor VARCHAR(255),
    recorded_by VARCHAR(255),
    payment_status VARCHAR(32) DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'cancelled')),
    receipt_reference VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_farm ON expenses(farm_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cycle ON expenses(crop_cycle_id);

-- 12. Harvest Records
CREATE TABLE IF NOT EXISTS harvest_records (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    crop_cycle_id VARCHAR(64) NOT NULL REFERENCES crop_cycles(id) ON DELETE RESTRICT,
    crop_name VARCHAR(128) NOT NULL,
    plot_name VARCHAR(128),
    harvest_date DATE NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(32) NOT NULL,
    quality_grade VARCHAR(64) NOT NULL,
    market_unit_price DECIMAL(10, 2) NOT NULL CHECK (market_unit_price >= 0),
    total_revenue DECIMAL(12, 2) NOT NULL CHECK (total_revenue >= 0),
    storage_location VARCHAR(128),
    recorded_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_harvest_farm ON harvest_records(farm_id);
CREATE INDEX IF NOT EXISTS idx_harvest_cycle ON harvest_records(crop_cycle_id);

-- 13. Produce Marketplace Listings
CREATE TABLE IF NOT EXISTS produce_listings (
    id VARCHAR(64) PRIMARY KEY,
    farmer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    farmer_name VARCHAR(255) NOT NULL,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE RESTRICT,
    crop_name VARCHAR(128) NOT NULL,
    variety VARCHAR(128) NOT NULL,
    quantity_available DECIMAL(10, 2) NOT NULL CHECK (quantity_available >= 0),
    unit VARCHAR(32) NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL CHECK (price_per_unit > 0),
    currency VARCHAR(16) DEFAULT 'LKR',
    available_from DATE DEFAULT CURRENT_DATE,
    harvest_date DATE,
    grade VARCHAR(64) NOT NULL,
    district VARCHAR(64) NOT NULL,
    description TEXT,
    image_url TEXT,
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'available', 'reserved', 'sold_out', 'unlisted')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_listings_farmer ON produce_listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON produce_listings(status);

-- 14. Produce Marketplace Orders
CREATE TABLE IF NOT EXISTS marketplace_orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number VARCHAR(64) UNIQUE NOT NULL,
    buyer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_phone VARCHAR(64) NOT NULL,
    delivery_address TEXT NOT NULL,
    district VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'dispatched', 'delivered', 'cancelled')),
    payment_method VARCHAR(64) NOT NULL,
    payment_status VARCHAR(32) DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(16) DEFAULT 'LKR',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON marketplace_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON marketplace_orders(status);

-- 15. Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    listing_id VARCHAR(64) NOT NULL REFERENCES produce_listings(id) ON DELETE RESTRICT,
    crop_name VARCHAR(128) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(32) NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL CHECK (price_per_unit > 0),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 16. Audit Log Stream
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    action VARCHAR(32) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_role VARCHAR(32) NOT NULL,
    actor_name VARCHAR(255),
    details TEXT NOT NULL,
    ip_address VARCHAR(64),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
