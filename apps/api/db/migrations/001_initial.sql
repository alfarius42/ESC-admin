CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  user_role ENUM('admin', 'sales', 'support', 'readonly') NOT NULL DEFAULT 'readonly',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  legal_name VARCHAR(500) NOT NULL,
  inn VARCHAR(12),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_legal_name (legal_name),
  INDEX idx_customers_inn (inn)
);

CREATE TABLE IF NOT EXISTS instances (
  id CHAR(36) NOT NULL PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  runtime_instance_id VARCHAR(24),
  hostname VARCHAR(255),
  deploy_url VARCHAR(500),
  integration_token_hash VARCHAR(64) NOT NULL,
  integration_token_issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  integration_token_rotated_at DATETIME NULL,
  last_token_verified_at DATETIME NULL,
  instance_status ENUM('planned', 'deployed', 'active', 'grace', 'expired', 'decommissioned', 'suspended') NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_instances_runtime_id (runtime_instance_id),
  INDEX idx_instances_customer (customer_id),
  CONSTRAINT fk_instances_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS price_lists (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  effective_from DATE NOT NULL,
  effective_until DATE NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'RUB',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  price_list_id CHAR(36) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  item_type ENUM('package', 'upsell', 'subscription_renewal') NOT NULL,
  title VARCHAR(500) NOT NULL,
  price_rub DECIMAL(12,2) NULL,
  price_note VARCHAR(255) NULL,
  modules JSON NOT NULL,
  subscription_renewal_rub DECIMAL(12,2) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_price_list_item (price_list_id, sku),
  CONSTRAINT fk_price_list_items_list FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS box_sales (
  id CHAR(36) NOT NULL PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  instance_id CHAR(36) NULL,
  license_id CHAR(36) NULL,
  package_sku VARCHAR(50) NOT NULL,
  modules JSON NOT NULL,
  list_price_rub DECIMAL(12,2) NOT NULL,
  sold_price_rub DECIMAL(12,2) NOT NULL,
  sold_at DATE NOT NULL,
  contract_ref VARCHAR(100) NULL,
  sales_user_id CHAR(36) NOT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_box_sales_sold_at (sold_at),
  INDEX idx_box_sales_customer (customer_id),
  CONSTRAINT fk_box_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_box_sales_instance FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE SET NULL,
  CONSTRAINT fk_box_sales_sales_user FOREIGN KEY (sales_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS upsell_sales (
  id CHAR(36) NOT NULL PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  instance_id CHAR(36) NULL,
  sku VARCHAR(50) NOT NULL,
  sku_category ENUM('license_upgrade', 'deploy', 'dev', 'support', 'legal', 'other') NOT NULL,
  title VARCHAR(500) NOT NULL,
  list_price_rub DECIMAL(12,2) NOT NULL,
  sold_price_rub DECIMAL(12,2) NOT NULL,
  sold_at DATE NOT NULL,
  contract_ref VARCHAR(100) NULL,
  sales_user_id CHAR(36) NOT NULL,
  linked_box_sale_id CHAR(36) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_upsell_sales_sold_at (sold_at),
  CONSTRAINT fk_upsell_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_upsell_sales_instance FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE SET NULL,
  CONSTRAINT fk_upsell_sales_sales_user FOREIGN KEY (sales_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_upsell_sales_box_sale FOREIGN KEY (linked_box_sale_id) REFERENCES box_sales(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS licenses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  instance_id CHAR(36) NOT NULL,
  package_slug VARCHAR(50) NOT NULL,
  modules JSON NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  subscription_year INT NOT NULL DEFAULT 1,
  license_status ENUM('draft', 'issued', 'active', 'grace', 'expired', 'revoked') NOT NULL DEFAULT 'draft',
  box_sale_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_licenses_instance (instance_id),
  CONSTRAINT fk_licenses_instance FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE RESTRICT,
  CONSTRAINT fk_licenses_box_sale FOREIGN KEY (box_sale_id) REFERENCES box_sales(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS activation_codes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  license_id CHAR(36) NOT NULL,
  code_type ENUM('initial', 'addon', 'renewal', 'pilot', 'reissue') NOT NULL,
  modules JSON NOT NULL,
  valid_until DATETIME NULL,
  pilot_until DATETIME NULL,
  target_instance_id VARCHAR(24) NULL,
  activation_code_encrypted TEXT NOT NULL,
  code_hash_prefix VARCHAR(16) NOT NULL,
  payload_json JSON NOT NULL,
  issued_by CHAR(36) NOT NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at DATETIME NULL,
  revoked_at DATETIME NULL,
  code_status ENUM('issued', 'activated', 'expired', 'revoked') NOT NULL DEFAULT 'issued',
  INDEX idx_activation_codes_license (license_id),
  INDEX idx_activation_codes_hash (code_hash_prefix),
  CONSTRAINT fk_activation_codes_license FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_activation_codes_issued_by FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id CHAR(36) NULL,
  diff_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_log_created (created_at),
  CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS support_threads (
  id CHAR(36) NOT NULL PRIMARY KEY,
  runtime_instance_id VARCHAR(24) NOT NULL,
  instance_id CHAR(36) NULL,
  customer_id CHAR(36) NULL,
  thread_status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  last_message_at DATETIME NULL,
  last_message_preview VARCHAR(200) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_support_threads_runtime_id (runtime_instance_id),
  INDEX idx_support_threads_customer (customer_id),
  UNIQUE KEY uq_support_thread_runtime_status (runtime_instance_id, thread_status),
  CONSTRAINT fk_support_threads_instance FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE SET NULL,
  CONSTRAINT fk_support_threads_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS support_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  thread_id CHAR(36) NOT NULL,
  sender_type ENUM('director', 'vendor') NOT NULL,
  sender_user_id CHAR(36) NULL,
  sender_display_name VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_support_messages_thread_created (thread_id, created_at),
  CONSTRAINT fk_support_messages_thread FOREIGN KEY (thread_id) REFERENCES support_threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_support_messages_sender FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL
);
