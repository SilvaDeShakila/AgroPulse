-- ============================================================================
-- AgroPulse Database Schema DDL (MySQL 8.0 InnoDB)
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS produce_listings;
DROP TABLE IF EXISTS harvests;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS farm_tasks;
DROP TABLE IF EXISTS crop_observations;
DROP TABLE IF EXISTS crop_cycles;
DROP TABLE IF EXISTS land_plots;
DROP TABLE IF EXISTS farm_members;
DROP TABLE IF EXISTS farms;
DROP TABLE IF EXISTS permission_role;
DROP TABLE IF EXISTS role_user;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users Table
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    district VARCHAR(100),
    organization VARCHAR(255),
    status ENUM('active', 'suspended', 'pending') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Roles & Permissions (RBAC)
CREATE TABLE roles (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE permissions (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE role_user (
    user_id CHAR(36) NOT NULL,
    role_id CHAR(36) NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE permission_role (
    role_id CHAR(36) NOT NULL,
    permission_id CHAR(36) NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Farms Table
CREATE TABLE farms (
    id CHAR(36) PRIMARY KEY,
    owner_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    total_area DECIMAL(10, 2) NOT NULL,
    area_unit ENUM('acres', 'hectares', 'sq_meters') DEFAULT 'acres',
    soil_primary VARCHAR(100) NOT NULL,
    irrigation_primary VARCHAR(100) NOT NULL,
    status ENUM('active', 'archived') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_farms_district (district),
    INDEX idx_farms_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Land Plots Table
CREATE TABLE land_plots (
    id CHAR(36) PRIMARY KEY,
    farm_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    plot_code VARCHAR(50) UNIQUE NOT NULL,
    area DECIMAL(8, 2) NOT NULL,
    area_unit ENUM('acres', 'hectares', 'sq_meters') DEFAULT 'acres',
    soil_type VARCHAR(150) NOT NULL,
    irrigation_type VARCHAR(150) NOT NULL,
    current_crop_cycle_id CHAR(36) NULL,
    status ENUM('cultivated', 'fallow', 'preparing', 'resting') DEFAULT 'resting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    INDEX idx_plots_farm (farm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Crop Cycles Table
CREATE TABLE crop_cycles (
    id CHAR(36) PRIMARY KEY,
    farm_id CHAR(36) NOT NULL,
    plot_id CHAR(36) NOT NULL,
    crop_name VARCHAR(150) NOT NULL,
    variety VARCHAR(150) NOT NULL,
    category ENUM('Paddy & Grains', 'Commercial Plantation', 'Vegetables', 'Spices', 'Fruits') NOT NULL,
    season ENUM('Maha (Major Monsoon)', 'Yala (Minor Monsoon)', 'Intermediate / Year-Round') NOT NULL,
    start_date DATE NOT NULL,
    expected_harvest_date DATE NOT NULL,
    actual_harvest_date DATE NULL,
    stage ENUM('Land Preparation', 'Sowing / Nursery', 'Vegetative Growth', 'Flowering / Tillering', 'Fruiting / Grain Fill', 'Ripening', 'Harvest Ready', 'Harvested') DEFAULT 'Land Preparation',
    target_yield_kg DECIMAL(12, 2) NOT NULL,
    actual_yield_kg DECIMAL(12, 2) NULL,
    status ENUM('planned', 'in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (plot_id) REFERENCES land_plots(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Crop Observations Table
CREATE TABLE crop_observations (
    id CHAR(36) PRIMARY KEY,
    crop_cycle_id CHAR(36) NOT NULL,
    farm_id CHAR(36) NOT NULL,
    author_id CHAR(36) NOT NULL,
    observation_type ENUM('Pest & Disease', 'Nutrient Deficiency', 'Growth Progress', 'Irrigation Check', 'Agronomist Advice') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity ENUM('low', 'moderate', 'high', 'critical') DEFAULT 'low',
    recommendation TEXT NULL,
    image_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crop_cycle_id) REFERENCES crop_cycles(id) ON DELETE CASCADE,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Farm Tasks Table
CREATE TABLE farm_tasks (
    id CHAR(36) PRIMARY KEY,
    farm_id CHAR(36) NOT NULL,
    crop_cycle_id CHAR(36) NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('irrigation', 'fertilizing', 'planting', 'inspection', 'harvesting', 'weeding', 'equipment') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'overdue') DEFAULT 'pending',
    assigned_to_id CHAR(36) NULL,
    due_date DATE NOT NULL,
    completed_at TIMESTAMP NULL,
    completion_notes TEXT NULL,
    completion_evidence_url VARCHAR(500) NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tasks_assigned_due (assigned_to_id, due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Inventory Items Table (Strict non-negative quantity)
CREATE TABLE inventory_items (
    id CHAR(36) PRIMARY KEY,
    farm_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    current_stock DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    min_reorder_level DECIMAL(12, 2) NOT NULL DEFAULT 10.00,
    cost_per_unit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    supplier_id CHAR(36) NULL,
    batch_number VARCHAR(100) NULL,
    expiry_date DATE NULL,
    location_storage VARCHAR(255) NOT NULL,
    status ENUM('in_stock', 'low_stock', 'out_of_stock') DEFAULT 'in_stock',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    CONSTRAINT chk_stock_non_negative CHECK (current_stock >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Stock Movements Table
CREATE TABLE stock_movements (
    id CHAR(36) PRIMARY KEY,
    inventory_item_id CHAR(36) NOT NULL,
    farm_id CHAR(36) NOT NULL,
    type ENUM('received', 'issued', 'adjustment', 'return') NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    previous_stock DECIMAL(12, 2) NOT NULL,
    new_stock DECIMAL(12, 2) NOT NULL,
    reference_reason VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NULL,
    actor_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Harvests Table
CREATE TABLE harvests (
    id CHAR(36) PRIMARY KEY,
    farm_id CHAR(36) NOT NULL,
    crop_cycle_id CHAR(36) NOT NULL,
    crop_name VARCHAR(150) NOT NULL,
    plot_name VARCHAR(150) NOT NULL,
    harvest_date DATE NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quality_grade VARCHAR(50) NOT NULL,
    estimated_market_price_per_unit DECIMAL(12, 2) NOT NULL,
    estimated_revenue DECIMAL(14, 2) NOT NULL,
    storage_location VARCHAR(255) NOT NULL,
    recorded_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
    FOREIGN KEY (crop_cycle_id) REFERENCES crop_cycles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Expenses Table
CREATE TABLE expenses (
    id CHAR(36) PRIMARY KEY,
    farm_id CHAR(36) NOT NULL,
    crop_cycle_id CHAR(36) NULL,
    category VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'LKR',
    date DATE NOT NULL,
    recorded_by VARCHAR(255) NOT NULL,
    receipt_number VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Produce Marketplace Listings
CREATE TABLE produce_listings (
    id CHAR(36) PRIMARY KEY,
    farmer_id CHAR(36) NOT NULL,
    farm_id CHAR(36) NOT NULL,
    crop_name VARCHAR(255) NOT NULL,
    variety VARCHAR(150) NOT NULL,
    district VARCHAR(100) NOT NULL,
    quantity_available DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL,
    price_per_unit DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'LKR',
    grade VARCHAR(50) NOT NULL,
    available_from DATE NOT NULL,
    image_url VARCHAR(500) NULL,
    status ENUM('active', 'reserved', 'sold_out') DEFAULT 'active',
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES users(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id),
    CONSTRAINT chk_listing_qty_non_negative CHECK (quantity_available >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Orders & Order Items
CREATE TABLE orders (
    id CHAR(36) PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    buyer_id CHAR(36) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_phone VARCHAR(50) NOT NULL,
    delivery_address TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    total_amount DECIMAL(14, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'LKR',
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'confirmed',
    payment_method VARCHAR(100) NOT NULL,
    payment_status ENUM('pending', 'verified', 'refunded') DEFAULT 'pending',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
    id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    listing_id CHAR(36) NOT NULL,
    crop_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    price_per_unit DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(14, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES produce_listings(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Audit Logs Table
CREATE TABLE audit_logs (
    id CHAR(36) PRIMARY KEY,
    actor_id CHAR(36) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    details TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_entity (entity, entity_id),
    INDEX idx_audit_actor (actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
