-- =============================================================================
-- Nexcoin — MySQL Database Setup
-- Run this once against your cPanel MySQL database to create all tables.
-- Compatible with MySQL 5.7+ and MariaDB 10.3+
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`                VARCHAR(36)  NOT NULL,
  `username`          VARCHAR(191) NOT NULL,
  `email`             VARCHAR(191) DEFAULT NULL,
  `password`          TEXT         NOT NULL,
  `role`              ENUM('super_admin','admin','staff','user') NOT NULL DEFAULT 'user',
  `full_name`         VARCHAR(191) DEFAULT NULL,
  `phone`             VARCHAR(50)  DEFAULT NULL,
  `avatar_url`        TEXT         DEFAULT NULL,
  `is_active`         TINYINT(1)   NOT NULL DEFAULT 1,
  `is_banned`         TINYINT(1)   NOT NULL DEFAULT 0,
  `is_email_verified` TINYINT(1)   NOT NULL DEFAULT 0,
  `is_subscribed`     TINYINT(1)   NOT NULL DEFAULT 0,
  `last_login_at`     TIMESTAMP    NULL DEFAULT NULL,
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Games ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `games` (
  `id`               VARCHAR(36)  NOT NULL,
  `name`             VARCHAR(191) NOT NULL,
  `slug`             VARCHAR(191) NOT NULL,
  `description`      TEXT         DEFAULT NULL,
  `logo_url`         TEXT         DEFAULT NULL,
  `banner_url`       TEXT         DEFAULT NULL,
  `category`         VARCHAR(100) NOT NULL DEFAULT 'game_currency',
  `status`           VARCHAR(20)  NOT NULL DEFAULT 'active',
  `is_trending`      TINYINT(1)   NOT NULL DEFAULT 0,
  `instant_delivery` TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`       INT          NOT NULL DEFAULT 0,
  `plugin_slug`      VARCHAR(100) DEFAULT NULL,
  `required_fields`  VARCHAR(100) DEFAULT 'userId',
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `games_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Services ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `services` (
  `id`               VARCHAR(36)    NOT NULL,
  `game_id`          VARCHAR(36)    NOT NULL,
  `name`             VARCHAR(191)   NOT NULL,
  `description`      TEXT           DEFAULT NULL,
  `image_url`        TEXT           DEFAULT NULL,
  `price`            DECIMAL(10,2)  NOT NULL,
  `discount_percent` DECIMAL(5,2)   NOT NULL DEFAULT '0.00',
  `final_price`      DECIMAL(10,2)  NOT NULL,
  `currency`         VARCHAR(10)    NOT NULL DEFAULT 'USD',
  `status`           VARCHAR(20)    NOT NULL DEFAULT 'active',
  `sort_order`       INT            NOT NULL DEFAULT 0,
  `stock`            INT            DEFAULT NULL,
  `plugin_slug`      VARCHAR(100)   DEFAULT NULL,
  `created_at`       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `services_game_id_idx` (`game_id`),
  CONSTRAINT `services_game_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `products` (
  `id`               VARCHAR(36)  NOT NULL,
  `title`            VARCHAR(191) NOT NULL,
  `description`      TEXT         DEFAULT NULL,
  `category`         ENUM('game_currency','gift_card','voucher','subscription') NOT NULL DEFAULT 'game_currency',
  `image_url`        TEXT         DEFAULT NULL,
  `is_active`        TINYINT(1)   NOT NULL DEFAULT 1,
  `instant_delivery` TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`       INT          NOT NULL DEFAULT 0,
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Product Packages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `product_packages` (
  `id`             VARCHAR(36)   NOT NULL,
  `product_id`     VARCHAR(36)   NOT NULL,
  `label`          VARCHAR(191)  NOT NULL,
  `price`          DECIMAL(10,2) NOT NULL,
  `original_price` DECIMAL(10,2) DEFAULT NULL,
  `is_active`      TINYINT(1)    NOT NULL DEFAULT 1,
  `stock`          INT           DEFAULT NULL,
  `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_packages_product_id_idx` (`product_id`),
  CONSTRAINT `product_packages_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `orders` (
  `id`                   VARCHAR(36)   NOT NULL,
  `user_id`              VARCHAR(36)   DEFAULT NULL,
  `order_number`         VARCHAR(191)  NOT NULL,
  `status`               ENUM('pending','processing','completed','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
  `total_amount`         DECIMAL(10,2) NOT NULL,
  `currency`             VARCHAR(10)   NOT NULL DEFAULT 'USD',
  `notes`                TEXT          DEFAULT NULL,
  `payment_method`       VARCHAR(100)  DEFAULT NULL,
  `utr`                  VARCHAR(100)  DEFAULT NULL,
  `payment_verified_at`  TIMESTAMP     NULL DEFAULT NULL,
  `delivery_status`      VARCHAR(50)   DEFAULT NULL,
  `delivery_note`        TEXT          DEFAULT NULL,
  `created_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_order_number_unique` (`order_number`),
  KEY `orders_user_id_idx` (`user_id`),
  CONSTRAINT `orders_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Order Items ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `order_items` (
  `id`            VARCHAR(36)   NOT NULL,
  `order_id`      VARCHAR(36)   NOT NULL,
  `product_id`    VARCHAR(36)   DEFAULT NULL,
  `package_id`    VARCHAR(36)   DEFAULT NULL,
  `product_title` VARCHAR(191)  NOT NULL,
  `package_label` VARCHAR(191)  DEFAULT NULL,
  `quantity`      INT           NOT NULL DEFAULT 1,
  `unit_price`    DECIMAL(10,2) NOT NULL,
  `total_price`   DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_items_order_id_idx` (`order_id`),
  CONSTRAINT `order_items_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `order_items_package_id_fk` FOREIGN KEY (`package_id`) REFERENCES `product_packages` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Page Views (Analytics) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `page_views` (
  `id`          VARCHAR(36)  NOT NULL,
  `session_id`  VARCHAR(64)  NOT NULL,
  `path`        VARCHAR(500) NOT NULL,
  `referrer`    VARCHAR(500) DEFAULT NULL,
  `device_type` VARCHAR(20)  DEFAULT NULL,
  `duration_ms` INT          DEFAULT NULL,
  `is_bounce`   TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `page_views_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `transactions` (
  `id`                 VARCHAR(36)   NOT NULL,
  `transaction_number` VARCHAR(50)   NOT NULL,
  `order_id`           VARCHAR(36)   DEFAULT NULL,
  `user_id`            VARCHAR(36)   DEFAULT NULL,
  `payment_method`     VARCHAR(100)  NOT NULL,
  `gateway`            VARCHAR(100)  DEFAULT NULL,
  `gateway_ref`        VARCHAR(191)  DEFAULT NULL,
  `amount`             DECIMAL(10,2) NOT NULL,
  `currency`           VARCHAR(10)   NOT NULL DEFAULT 'USD',
  `status`             ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
  `failure_reason`     TEXT          DEFAULT NULL,
  `is_refund`          TINYINT(1)    NOT NULL DEFAULT 0,
  `created_at`         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at`       TIMESTAMP     NULL DEFAULT NULL,
  `updated_at`         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transactions_transaction_number_unique` (`transaction_number`),
  KEY `transactions_order_id_idx` (`order_id`),
  KEY `transactions_user_id_idx` (`user_id`),
  CONSTRAINT `transactions_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `transactions_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Coupons ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `coupons` (
  `id`               VARCHAR(36)   NOT NULL,
  `code`             VARCHAR(100)  NOT NULL,
  `description`      TEXT          DEFAULT NULL,
  `discount_type`    VARCHAR(50)   NOT NULL DEFAULT 'percentage',
  `discount_value`   DECIMAL(10,2) NOT NULL,
  `min_order_amount` DECIMAL(10,2) DEFAULT NULL,
  `max_uses`         INT           DEFAULT NULL,
  `used_count`       INT           NOT NULL DEFAULT 0,
  `is_active`        TINYINT(1)    NOT NULL DEFAULT 1,
  `expires_at`       TIMESTAMP     NULL DEFAULT NULL,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupons_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Support Tickets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tickets` (
  `id`            VARCHAR(36)  NOT NULL,
  `ticket_number` VARCHAR(50)  NOT NULL,
  `user_id`       VARCHAR(36)  DEFAULT NULL,
  `subject`       VARCHAR(255) NOT NULL,
  `message`       TEXT         NOT NULL,
  `category`      VARCHAR(100) DEFAULT NULL,
  `status`        ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `priority`      ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `assigned_to`   VARCHAR(36)  DEFAULT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tickets_ticket_number_unique` (`ticket_number`),
  KEY `tickets_user_id_idx` (`user_id`),
  CONSTRAINT `tickets_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `tickets_assigned_to_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Ticket Replies ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ticket_replies` (
  `id`             VARCHAR(36) NOT NULL,
  `ticket_id`      VARCHAR(36) NOT NULL,
  `user_id`        VARCHAR(36) DEFAULT NULL,
  `message`        TEXT        NOT NULL,
  `is_staff`       TINYINT(1)  NOT NULL DEFAULT 0,
  `attachment_url` TEXT        DEFAULT NULL,
  `created_at`     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ticket_replies_ticket_id_idx` (`ticket_id`),
  CONSTRAINT `ticket_replies_ticket_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_replies_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Campaigns ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id`          VARCHAR(36)  NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `description` TEXT         DEFAULT NULL,
  `type`        VARCHAR(50)  NOT NULL DEFAULT 'banner',
  `banner_url`  TEXT         DEFAULT NULL,
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
  `starts_at`   TIMESTAMP    NULL DEFAULT NULL,
  `ends_at`     TIMESTAMP    NULL DEFAULT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Hero Sliders ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `hero_sliders` (
  `id`                 VARCHAR(36)  NOT NULL,
  `title`              VARCHAR(191) NOT NULL,
  `subtitle`           TEXT         DEFAULT NULL,
  `banner_url`         TEXT         DEFAULT NULL,
  `button_text`        VARCHAR(100) DEFAULT NULL,
  `button_link`        VARCHAR(500) DEFAULT NULL,
  `linked_game_id`     VARCHAR(36)  DEFAULT NULL,
  `linked_product_id`  VARCHAR(36)  DEFAULT NULL,
  `starts_at`          TIMESTAMP    NULL DEFAULT NULL,
  `ends_at`            TIMESTAMP    NULL DEFAULT NULL,
  `show_button`        TINYINT(1)   NOT NULL DEFAULT 1,
  `show_text`          TINYINT(1)   NOT NULL DEFAULT 1,
  `is_active`          TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`         INT          NOT NULL DEFAULT 0,
  `created_at`         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `hero_sliders_game_id_idx` (`linked_game_id`),
  KEY `hero_sliders_product_id_idx` (`linked_product_id`),
  CONSTRAINT `hero_sliders_game_id_fk` FOREIGN KEY (`linked_game_id`) REFERENCES `games` (`id`) ON DELETE SET NULL,
  CONSTRAINT `hero_sliders_product_id_fk` FOREIGN KEY (`linked_product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `reviews` (
  `id`          VARCHAR(36) NOT NULL,
  `user_id`     VARCHAR(36) DEFAULT NULL,
  `product_id`  VARCHAR(36) DEFAULT NULL,
  `rating`      INT         NOT NULL,
  `comment`     TEXT        DEFAULT NULL,
  `is_approved` TINYINT(1)  NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reviews_user_id_idx` (`user_id`),
  KEY `reviews_product_id_idx` (`product_id`),
  CONSTRAINT `reviews_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `reviews_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Payment Methods ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id`                   VARCHAR(36)  NOT NULL,
  `name`                 VARCHAR(191) NOT NULL,
  `type`                 VARCHAR(50)  NOT NULL,
  `payment_type`         VARCHAR(20)  NOT NULL DEFAULT 'CARD',
  `provider`             VARCHAR(100) DEFAULT NULL,
  `public_key`           TEXT         DEFAULT NULL,
  `secret_key`           TEXT         DEFAULT NULL,
  `webhook_secret`       TEXT         DEFAULT NULL,
  `mode`                 VARCHAR(20)  NOT NULL DEFAULT 'test',
  `supported_currencies` TEXT         DEFAULT NULL,
  `is_active`            TINYINT(1)   NOT NULL DEFAULT 1,
  `config`               TEXT         DEFAULT NULL,
  `sort_order`           INT          NOT NULL DEFAULT 0,
  `created_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Plugins ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plugins` (
  `id`              VARCHAR(36)  NOT NULL,
  `slug`            VARCHAR(100) NOT NULL,
  `name`            VARCHAR(191) NOT NULL,
  `description`     TEXT         DEFAULT NULL,
  `category`        VARCHAR(50)  NOT NULL DEFAULT 'integration',
  `plugin_type`     VARCHAR(50)  DEFAULT 'integration',
  `version`         VARCHAR(20)  DEFAULT '1.0.0',
  `author`          VARCHAR(191) DEFAULT NULL,
  `is_enabled`      TINYINT(1)   NOT NULL DEFAULT 0,
  `config`          TEXT         DEFAULT NULL,
  `settings_schema` TEXT         DEFAULT NULL,
  `installed_at`    TIMESTAMP    NULL DEFAULT NULL,
  `file_size`       INT          DEFAULT NULL,
  `install_path`    VARCHAR(500) DEFAULT NULL,
  `status`          VARCHAR(20)  NOT NULL DEFAULT 'inactive',
  `hooks`           TEXT         DEFAULT NULL,
  `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plugins_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         VARCHAR(36)  NOT NULL,
  `type`       VARCHAR(50)  NOT NULL DEFAULT 'info',
  `title`      VARCHAR(191) NOT NULL,
  `message`    TEXT         NOT NULL,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  `metadata`   TEXT         DEFAULT NULL,
  `read_at`    TIMESTAMP    NULL DEFAULT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Email Templates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `email_templates` (
  `id`          VARCHAR(36)  NOT NULL,
  `type`        VARCHAR(50)  NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `subject`     VARCHAR(500) NOT NULL,
  `title`       VARCHAR(500) NOT NULL,
  `body`        TEXT         NOT NULL,
  `footer_text` VARCHAR(500) DEFAULT NULL,
  `button_text` VARCHAR(191) DEFAULT NULL,
  `button_link` VARCHAR(500) DEFAULT NULL,
  `copy_email`  VARCHAR(191) DEFAULT NULL,
  `is_enabled`  TINYINT(1)   NOT NULL DEFAULT 1,
  `styles`      TEXT         DEFAULT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_templates_type_unique` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Sessions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`         VARCHAR(36)  NOT NULL,
  `user_id`    VARCHAR(36)  NOT NULL,
  `token`      VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45)  DEFAULT NULL,
  `user_agent` TEXT         DEFAULT NULL,
  `expires_at` TIMESTAMP    NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessions_token_unique` (`token`),
  KEY `sessions_user_id_idx` (`user_id`),
  CONSTRAINT `sessions_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`         VARCHAR(36)  NOT NULL,
  `user_id`    VARCHAR(36)  DEFAULT NULL,
  `action`     VARCHAR(100) NOT NULL,
  `entity`     VARCHAR(100) DEFAULT NULL,
  `entity_id`  VARCHAR(36)  DEFAULT NULL,
  `old_values` TEXT         DEFAULT NULL,
  `new_values` TEXT         DEFAULT NULL,
  `ip_address` VARCHAR(45)  DEFAULT NULL,
  `user_agent` TEXT         DEFAULT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_idx` (`user_id`),
  CONSTRAINT `audit_logs_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Email Verification Tokens ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `id`          VARCHAR(36)  NOT NULL,
  `user_id`     VARCHAR(36)  NOT NULL,
  `token`       VARCHAR(255) NOT NULL,
  `expires_at`  TIMESTAMP    NOT NULL,
  `verified_at` TIMESTAMP    NULL DEFAULT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_verification_tokens_token_unique` (`token`),
  KEY `email_verification_tokens_user_id_idx` (`user_id`),
  CONSTRAINT `email_verification_tokens_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Password Reset Tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`           VARCHAR(36) NOT NULL,
  `user_id`      VARCHAR(36) NOT NULL,
  `otp_hash`     TEXT        NOT NULL,
  `reset_token`  TEXT        DEFAULT NULL,
  `expires_at`   TIMESTAMP   NOT NULL,
  `attempts`     INT         NOT NULL DEFAULT 0,
  `created_at`   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `password_reset_tokens_user_id_idx` (`user_id`),
  CONSTRAINT `password_reset_tokens_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Site Settings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id`         VARCHAR(36)  NOT NULL,
  `key`        VARCHAR(100) NOT NULL,
  `value`      TEXT         DEFAULT NULL,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `site_settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Fees ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `fees` (
  `id`          VARCHAR(36)   NOT NULL,
  `name`        VARCHAR(100)  NOT NULL,
  `description` TEXT          DEFAULT NULL,
  `amount`      DECIMAL(10,2) NOT NULL,
  `type`        VARCHAR(20)   NOT NULL DEFAULT 'fixed',
  `is_active`   TINYINT(1)    NOT NULL DEFAULT 1,
  `sort_order`  INT           NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Busan Configs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `busan_configs` (
  `id`           VARCHAR(36)  NOT NULL,
  `api_token`    VARCHAR(255) DEFAULT NULL,
  `api_base_url` VARCHAR(500) NOT NULL DEFAULT 'https://1gamestopup.com/api/v1',
  `currency`     VARCHAR(20)  NOT NULL DEFAULT 'IDR',
  `is_active`    TINYINT(1)   NOT NULL DEFAULT 1,
  `updated_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Busan Mappings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `busan_mappings` (
  `id`                VARCHAR(36)  NOT NULL,
  `cms_product_id`    VARCHAR(36)  NOT NULL,
  `cms_product_name`  VARCHAR(191) DEFAULT NULL,
  `busan_product_id`  VARCHAR(191) NOT NULL,
  `busan_product_name` VARCHAR(191) DEFAULT NULL,
  `requires_zone`     TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Smile.one Configs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `smile_one_configs` (
  `id`          VARCHAR(36)  NOT NULL,
  `uid`         VARCHAR(191) DEFAULT NULL,
  `api_key`     VARCHAR(255) DEFAULT NULL,
  `license_key` VARCHAR(255) DEFAULT NULL,
  `region`      VARCHAR(50)  NOT NULL DEFAULT 'global',
  `email`       VARCHAR(191) DEFAULT NULL,
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Smile.one Mappings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `smile_one_mappings` (
  `id`                 VARCHAR(36)  NOT NULL,
  `cms_product_id`     VARCHAR(36)  NOT NULL,
  `cms_product_name`   VARCHAR(191) DEFAULT NULL,
  `smile_product_id`   VARCHAR(191) NOT NULL,
  `smile_product_name` VARCHAR(191) DEFAULT NULL,
  `game_slug`          VARCHAR(191) NOT NULL,
  `region`             VARCHAR(50)  NOT NULL DEFAULT 'global',
  `created_at`         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Liogames Config ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `liogames_configs` (
  `id`          VARCHAR(36)  NOT NULL,
  `member_code` VARCHAR(191) DEFAULT NULL,
  `secret`      VARCHAR(255) DEFAULT NULL,
  `base_url`    VARCHAR(500) NOT NULL DEFAULT 'https://api.liogames.com/wp-json/liogames/v1',
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Liogames Mappings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `liogames_mappings` (
  `id`               VARCHAR(36)  NOT NULL,
  `cms_product_id`   VARCHAR(36)  NOT NULL,
  `cms_product_name` VARCHAR(191) DEFAULT NULL,
  `lio_product_id`   INT          NOT NULL,
  `lio_variation_id` INT          DEFAULT NULL,
  `lio_product_name` VARCHAR(191) DEFAULT NULL,
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── UPI Payment Settings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `upi_payment_settings` (
  `id`             VARCHAR(36)  NOT NULL,
  `upi_id`         VARCHAR(191) DEFAULT NULL,
  `qr_code_url`    TEXT         DEFAULT NULL,
  `email_address`  VARCHAR(191) DEFAULT NULL,
  `email_password` TEXT         DEFAULT NULL,
  `imap_host`      VARCHAR(191) NOT NULL DEFAULT 'imap.gmail.com',
  `imap_port`      INT          NOT NULL DEFAULT 993,
  `imap_label`     VARCHAR(255) NOT NULL DEFAULT 'INBOX',
  `is_active`      TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Unmatched Payments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `unmatched_payments` (
  `id`                    VARCHAR(36)   NOT NULL,
  `amount`                DECIMAL(10,2) NOT NULL,
  `utr`                   VARCHAR(100)  DEFAULT NULL,
  `sender_name`           VARCHAR(191)  DEFAULT NULL,
  `email_subject`         VARCHAR(500)  DEFAULT NULL,
  `raw_body`              TEXT          DEFAULT NULL,
  `detected_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_to_order_id`  VARCHAR(36)   DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `unmatched_payments_order_id_idx` (`assigned_to_order_id`),
  CONSTRAINT `unmatched_payments_order_id_fk` FOREIGN KEY (`assigned_to_order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Role Permissions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id`          VARCHAR(36)  NOT NULL,
  `role`        VARCHAR(80)  NOT NULL,
  `label`       VARCHAR(120) NOT NULL,
  `is_system`   TINYINT(1)   NOT NULL DEFAULT 0,
  `permissions` TEXT         NOT NULL DEFAULT '[]',
  `sort_order`  INT          NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permissions_role_unique` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Push Subscriptions (PWA Web Push) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id`         VARCHAR(36) NOT NULL,
  `endpoint`   TEXT        NOT NULL,
  `p256dh`     TEXT        NOT NULL,
  `auth`       TEXT        NOT NULL,
  `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `push_subscriptions_endpoint_unique` (`endpoint`(500))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Safe upgrade fixes for older databases
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `is_banned` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`,
  ADD COLUMN IF NOT EXISTS `is_email_verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_banned`,
  ADD COLUMN IF NOT EXISTS `is_subscribed` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_email_verified`;

-- =============================================================================
-- Default admin user (password: admin123456 — CHANGE THIS AFTER FIRST LOGIN)
-- =============================================================================
INSERT IGNORE INTO `users` (`id`, `username`, `email`, `password`, `role`, `full_name`, `is_active`, `is_banned`, `is_email_verified`, `is_subscribed`, `created_at`, `updated_at`)
VALUES (
  'admin-00000000-0000-0000-0000-000000000001',
  'admin',
  'admin@nexcoin.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123456
  'super_admin',
  'Administrator',
  1, 0, 1, 0,
  NOW(), NOW()
);

-- Default role permissions
INSERT IGNORE INTO `role_permissions` (`id`, `role`, `label`, `is_system`, `permissions`, `sort_order`, `created_at`, `updated_at`) VALUES
('rp-super-admin', 'super_admin', 'Super Admin', 1, '["all"]', 0, NOW(), NOW()),
('rp-admin',       'admin',       'Admin',       1, '["dashboard","analytics","users","games","services","products","orders","transactions","tickets","campaigns","coupons","payment_methods","email_templates","plugins","site_settings","hero_sliders","api_integration","reports","notifications","upi_settings","payment_logs","roles"]', 1, NOW(), NOW()),
('rp-staff',       'staff',       'Staff',       1, '["dashboard","orders","tickets","users"]', 2, NOW(), NOW()),
('rp-user',        'user',        'User',        1, '[]', 3, NOW(), NOW());
