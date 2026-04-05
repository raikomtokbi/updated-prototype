-- ============================================================
--  Nexcoin — Full MySQL Schema
--  Generated from shared/schema.ts (Drizzle mysql-core)
--  Compatible with MySQL 5.7+ and MariaDB 10.4+
--
--  Import via phpMyAdmin OR:
--    mysql -u USER -p DATABASE < migrations/mysql-schema.sql
--
--  After import, run:
--    npm run db:push    (optional — confirms schema is in sync)
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;

-- ─── users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`                VARCHAR(36)   NOT NULL,
  `username`          VARCHAR(191)  NOT NULL,
  `email`             VARCHAR(191)  DEFAULT NULL,
  `password`          TEXT          NOT NULL,
  `role`              ENUM('super_admin','admin','staff','user') NOT NULL DEFAULT 'user',
  `full_name`         VARCHAR(191)  DEFAULT NULL,
  `phone`             VARCHAR(50)   DEFAULT NULL,
  `avatar_url`        TEXT          DEFAULT NULL,
  `is_active`         TINYINT(1)    NOT NULL DEFAULT 1,
  `is_email_verified` TINYINT(1)    NOT NULL DEFAULT 0,
  `is_subscribed`     TINYINT(1)    NOT NULL DEFAULT 0,
  `last_login_at`     DATETIME      DEFAULT NULL,
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_uq` (`username`),
  UNIQUE KEY `users_email_uq` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── sessions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`         VARCHAR(36)  NOT NULL,
  `user_id`    VARCHAR(36)  NOT NULL,
  `token`      VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45)  DEFAULT NULL,
  `user_agent` TEXT         DEFAULT NULL,
  `expires_at` DATETIME     NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessions_token_uq` (`token`),
  KEY `sessions_user_id_idx` (`user_id`),
  KEY `sessions_expires_at_idx` (`expires_at`),
  CONSTRAINT `sessions_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── audit_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`          VARCHAR(36)  NOT NULL,
  `user_id`     VARCHAR(36)  DEFAULT NULL,
  `action`      VARCHAR(100) NOT NULL,
  `entity`      VARCHAR(100) DEFAULT NULL,
  `entity_id`   VARCHAR(36)  DEFAULT NULL,
  `old_values`  TEXT         DEFAULT NULL,
  `new_values`  TEXT         DEFAULT NULL,
  `ip_address`  VARCHAR(45)  DEFAULT NULL,
  `user_agent`  TEXT         DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_idx` (`user_id`),
  KEY `audit_logs_entity_idx` (`entity`, `entity_id`),
  KEY `audit_logs_created_at_idx` (`created_at`),
  CONSTRAINT `audit_logs_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── email_verification_tokens ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `id`          VARCHAR(36)  NOT NULL,
  `user_id`     VARCHAR(36)  NOT NULL,
  `token`       VARCHAR(255) NOT NULL,
  `expires_at`  DATETIME     NOT NULL,
  `verified_at` DATETIME     DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_verification_tokens_token_uq` (`token`),
  KEY `email_verification_tokens_user_id_idx` (`user_id`),
  CONSTRAINT `email_verification_tokens_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── password_reset_tokens ────────────────────────────────────────────────────
--   Stores OTP hash for forgot-password flow + final signed reset token.
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`          VARCHAR(36) NOT NULL,
  `user_id`     VARCHAR(36) NOT NULL,
  `otp_hash`    TEXT        NOT NULL,
  `reset_token` TEXT        DEFAULT NULL,
  `expires_at`  DATETIME    NOT NULL,
  `attempts`    INT         NOT NULL DEFAULT 0,
  `created_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `password_reset_tokens_user_id_idx` (`user_id`),
  KEY `password_reset_tokens_expires_at_idx` (`expires_at`),
  CONSTRAINT `password_reset_tokens_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── games ────────────────────────────────────────────────────────────────────
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
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `games_slug_uq` (`slug`),
  KEY `games_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── services (top-up denominations per game) ─────────────────────────────────
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
  `plugin_slug`      VARCHAR(100)   DEFAULT NULL,
  `created_at`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `services_game_id_idx` (`game_id`),
  CONSTRAINT `services_game_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── products (vouchers, gift cards, subscriptions) ───────────────────────────
CREATE TABLE IF NOT EXISTS `products` (
  `id`               VARCHAR(36) NOT NULL,
  `title`            VARCHAR(191) NOT NULL,
  `description`      TEXT         DEFAULT NULL,
  `category`         ENUM('game_currency','gift_card','voucher','subscription') NOT NULL DEFAULT 'game_currency',
  `image_url`        TEXT         DEFAULT NULL,
  `is_active`        TINYINT(1)   NOT NULL DEFAULT 1,
  `instant_delivery` TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`       INT          NOT NULL DEFAULT 0,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `products_category_idx` (`category`),
  KEY `products_is_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── product_packages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `product_packages` (
  `id`             VARCHAR(36)   NOT NULL,
  `product_id`     VARCHAR(36)   NOT NULL,
  `label`          VARCHAR(191)  NOT NULL,
  `price`          DECIMAL(10,2) NOT NULL,
  `original_price` DECIMAL(10,2) DEFAULT NULL,
  `is_active`      TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_packages_product_id_idx` (`product_id`),
  CONSTRAINT `product_packages_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `orders` (
  `id`           VARCHAR(36)   NOT NULL,
  `user_id`      VARCHAR(36)   DEFAULT NULL,
  `order_number` VARCHAR(191)  NOT NULL,
  `status`       ENUM('pending','processing','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `total_amount` DECIMAL(10,2) NOT NULL,
  `currency`     VARCHAR(10)   NOT NULL DEFAULT 'USD',
  `notes`        TEXT          DEFAULT NULL,
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_order_number_uq` (`order_number`),
  KEY `orders_user_id_idx` (`user_id`),
  KEY `orders_status_idx` (`status`),
  KEY `orders_created_at_idx` (`created_at`),
  CONSTRAINT `orders_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── order_items ──────────────────────────────────────────────────────────────
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
  KEY `order_items_product_id_idx` (`product_id`),
  CONSTRAINT `order_items_order_id_fk`   FOREIGN KEY (`order_id`)   REFERENCES `orders`           (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`         (`id`) ON DELETE SET NULL,
  CONSTRAINT `order_items_package_id_fk` FOREIGN KEY (`package_id`) REFERENCES `product_packages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── transactions ─────────────────────────────────────────────────────────────
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
  `created_at`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transactions_number_uq` (`transaction_number`),
  KEY `transactions_order_id_idx` (`order_id`),
  KEY `transactions_user_id_idx` (`user_id`),
  KEY `transactions_status_idx` (`status`),
  CONSTRAINT `transactions_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `transactions_user_id_fk`  FOREIGN KEY (`user_id`)  REFERENCES `users`  (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── coupons ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `coupons` (
  `id`                VARCHAR(36)   NOT NULL,
  `code`              VARCHAR(100)  NOT NULL,
  `description`       TEXT          DEFAULT NULL,
  `discount_type`     VARCHAR(50)   NOT NULL DEFAULT 'percentage',
  `discount_value`    DECIMAL(10,2) NOT NULL,
  `min_order_amount`  DECIMAL(10,2) DEFAULT NULL,
  `max_uses`          INT           DEFAULT NULL,
  `used_count`        INT           NOT NULL DEFAULT 0,
  `is_active`         TINYINT(1)    NOT NULL DEFAULT 1,
  `expires_at`        DATETIME      DEFAULT NULL,
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupons_code_uq` (`code`),
  KEY `coupons_is_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── tickets ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tickets` (
  `id`            VARCHAR(36)  NOT NULL,
  `ticket_number` VARCHAR(50)  NOT NULL,
  `user_id`       VARCHAR(36)  DEFAULT NULL,
  `subject`       VARCHAR(255) NOT NULL,
  `message`       TEXT         NOT NULL,
  `status`        ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `priority`      ENUM('low','medium','high','urgent')           NOT NULL DEFAULT 'medium',
  `assigned_to`   VARCHAR(36)  DEFAULT NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tickets_ticket_number_uq` (`ticket_number`),
  KEY `tickets_user_id_idx` (`user_id`),
  KEY `tickets_status_idx` (`status`),
  CONSTRAINT `tickets_user_id_fk`    FOREIGN KEY (`user_id`)     REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tickets_assigned_to_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ticket_replies ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ticket_replies` (
  `id`         VARCHAR(36) NOT NULL,
  `ticket_id`  VARCHAR(36) NOT NULL,
  `user_id`    VARCHAR(36) DEFAULT NULL,
  `message`    TEXT        NOT NULL,
  `is_staff`   TINYINT(1)  NOT NULL DEFAULT 0,
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ticket_replies_ticket_id_idx` (`ticket_id`),
  CONSTRAINT `ticket_replies_ticket_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_replies_user_id_fk`   FOREIGN KEY (`user_id`)   REFERENCES `users`   (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── campaigns ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id`          VARCHAR(36)  NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `description` TEXT         DEFAULT NULL,
  `type`        VARCHAR(50)  NOT NULL DEFAULT 'banner',
  `banner_url`  TEXT         DEFAULT NULL,
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
  `starts_at`   DATETIME     DEFAULT NULL,
  `ends_at`     DATETIME     DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `campaigns_is_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── hero_sliders ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `hero_sliders` (
  `id`                VARCHAR(36)  NOT NULL,
  `title`             VARCHAR(191) NOT NULL,
  `subtitle`          TEXT         DEFAULT NULL,
  `banner_url`        TEXT         DEFAULT NULL,
  `button_text`       VARCHAR(100) DEFAULT NULL,
  `button_link`       VARCHAR(500) DEFAULT NULL,
  `linked_game_id`    VARCHAR(36)  DEFAULT NULL,
  `linked_product_id` VARCHAR(36)  DEFAULT NULL,
  `starts_at`         DATETIME     DEFAULT NULL,
  `ends_at`           DATETIME     DEFAULT NULL,
  `is_active`         TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`        INT          NOT NULL DEFAULT 0,
  `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `hero_sliders_is_active_idx` (`is_active`),
  KEY `hero_sliders_sort_order_idx` (`sort_order`),
  CONSTRAINT `hero_sliders_game_id_fk`    FOREIGN KEY (`linked_game_id`)    REFERENCES `games`    (`id`) ON DELETE SET NULL,
  CONSTRAINT `hero_sliders_product_id_fk` FOREIGN KEY (`linked_product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `reviews` (
  `id`          VARCHAR(36) NOT NULL,
  `user_id`     VARCHAR(36) DEFAULT NULL,
  `product_id`  VARCHAR(36) DEFAULT NULL,
  `rating`      INT         NOT NULL,
  `comment`     TEXT        DEFAULT NULL,
  `is_approved` TINYINT(1)  NOT NULL DEFAULT 0,
  `created_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reviews_user_id_idx` (`user_id`),
  KEY `reviews_product_id_idx` (`product_id`),
  CONSTRAINT `reviews_user_id_fk`    FOREIGN KEY (`user_id`)    REFERENCES `users`    (`id`) ON DELETE SET NULL,
  CONSTRAINT `reviews_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── payment_methods ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id`                   VARCHAR(36)  NOT NULL,
  `name`                 VARCHAR(191) NOT NULL,
  `type`                 VARCHAR(50)  NOT NULL,
  `provider`             VARCHAR(100) DEFAULT NULL,
  `public_key`           TEXT         DEFAULT NULL,
  `secret_key`           TEXT         DEFAULT NULL,
  `webhook_secret`       TEXT         DEFAULT NULL,
  `mode`                 VARCHAR(20)  NOT NULL DEFAULT 'test',
  `supported_currencies` TEXT         DEFAULT NULL,
  `is_active`            TINYINT(1)   NOT NULL DEFAULT 1,
  `config`               TEXT         DEFAULT NULL,
  `sort_order`           INT          NOT NULL DEFAULT 0,
  `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── plugins ──────────────────────────────────────────────────────────────────
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
  `installed_at`    DATETIME     DEFAULT NULL,
  `file_size`       INT          DEFAULT NULL,
  `install_path`    VARCHAR(500) DEFAULT NULL,
  `status`          VARCHAR(20)  NOT NULL DEFAULT 'inactive',
  `hooks`           TEXT         DEFAULT NULL,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plugins_slug_uq` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         VARCHAR(36)  NOT NULL,
  `type`       VARCHAR(50)  NOT NULL DEFAULT 'info',
  `title`      VARCHAR(191) NOT NULL,
  `message`    TEXT         NOT NULL,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  `metadata`   TEXT         DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `notifications_is_read_idx` (`is_read`),
  KEY `notifications_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── email_templates ──────────────────────────────────────────────────────────
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
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_templates_type_uq` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── site_settings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id`         VARCHAR(36)  NOT NULL,
  `key`        VARCHAR(100) NOT NULL,
  `value`      TEXT         DEFAULT NULL,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `site_settings_key_uq` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── fees ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `fees` (
  `id`          VARCHAR(36)    NOT NULL,
  `name`        VARCHAR(100)   NOT NULL,
  `description` TEXT           DEFAULT NULL,
  `amount`      DECIMAL(10,2)  NOT NULL,
  `type`        VARCHAR(20)    NOT NULL DEFAULT 'fixed',
  `is_active`   TINYINT(1)     NOT NULL DEFAULT 1,
  `sort_order`  INT            NOT NULL DEFAULT 0,
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fees_is_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── smile_one_configs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `smile_one_configs` (
  `id`           VARCHAR(36)  NOT NULL,
  `uid`          VARCHAR(191) DEFAULT NULL,
  `api_key`      VARCHAR(255) DEFAULT NULL,
  `license_key`  VARCHAR(255) DEFAULT NULL,
  `region`       VARCHAR(50)  NOT NULL DEFAULT 'global',
  `email`        VARCHAR(191) DEFAULT NULL,
  `is_active`    TINYINT(1)   NOT NULL DEFAULT 1,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── smile_one_mappings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `smile_one_mappings` (
  `id`                  VARCHAR(36)  NOT NULL,
  `cms_product_id`      VARCHAR(36)  NOT NULL,
  `cms_product_name`    VARCHAR(191) DEFAULT NULL,
  `smile_product_id`    VARCHAR(191) NOT NULL,
  `smile_product_name`  VARCHAR(191) DEFAULT NULL,
  `game_slug`           VARCHAR(191) NOT NULL,
  `region`              VARCHAR(50)  NOT NULL DEFAULT 'global',
  `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `smile_one_mappings_game_slug_idx` (`game_slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── busan_configs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `busan_configs` (
  `id`            VARCHAR(36)   NOT NULL,
  `api_token`     VARCHAR(255)  DEFAULT NULL,
  `api_base_url`  VARCHAR(500)  NOT NULL DEFAULT 'https://busangame.com/api',
  `currency`      VARCHAR(20)   NOT NULL DEFAULT 'IDR',
  `is_active`     TINYINT(1)    NOT NULL DEFAULT 1,
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── busan_mappings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `busan_mappings` (
  `id`                  VARCHAR(36)  NOT NULL,
  `cms_product_id`      VARCHAR(36)  NOT NULL,
  `cms_product_name`    VARCHAR(191) DEFAULT NULL,
  `busan_product_id`    VARCHAR(191) NOT NULL,
  `busan_product_name`  VARCHAR(191) DEFAULT NULL,
  `requires_zone`       TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `busan_mappings_cms_product_id_idx` (`cms_product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  Table summary (28 tables total)
-- ============================================================
--   users                      — registered accounts
--   sessions                   — server-side user sessions
--   audit_logs                 — admin/user action log
--   email_verification_tokens  — email verification flow
--   password_reset_tokens      — OTP-based forgot password flow
--   games                      — top-up game catalogue
--   services                   — top-up denominations per game
--   products                   — vouchers / gift cards / subscriptions
--   product_packages           — pricing tiers per product
--   orders                     — customer orders
--   order_items                — line items within an order
--   transactions               — payment gateway records
--   coupons                    — discount codes
--   tickets                    — support tickets
--   ticket_replies             — replies on support tickets
--   campaigns                  — promotional banners / campaigns
--   hero_sliders               — storefront hero carousel
--   reviews                    — product reviews
--   payment_methods            — configured payment gateways
--   plugins                    — installed integrations / plugins
--   notifications              — admin notification inbox
--   email_templates            — transactional email templates (incl. copy_email, styles)
--   site_settings              — key-value site configuration
--   fees                       — processing / service fees
--   smile_one_configs          — Smile.one API credentials & settings
--   smile_one_mappings         — product ID mappings for Smile.one
-- ============================================================
