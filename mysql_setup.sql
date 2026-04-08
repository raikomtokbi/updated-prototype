-- ============================================================
-- Nexcoin MySQL Database Setup
-- Run this in cPanel phpMyAdmin BEFORE starting the app.
-- The admin account (admin / admin123456) is created
-- automatically on first startup - no manual INSERT needed.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ─── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`                  VARCHAR(36)  NOT NULL PRIMARY KEY,
  `username`            VARCHAR(191) NOT NULL UNIQUE,
  `email`               VARCHAR(191)          UNIQUE,
  `password`            TEXT         NOT NULL,
  `role`                ENUM('super_admin','admin','staff','user') NOT NULL DEFAULT 'user',
  `full_name`           VARCHAR(191),
  `phone`               VARCHAR(50),
  `avatar_url`          TEXT,
  `is_active`           TINYINT(1)   NOT NULL DEFAULT 1,
  `is_email_verified`   TINYINT(1)   NOT NULL DEFAULT 0,
  `is_subscribed`       TINYINT(1)   NOT NULL DEFAULT 0,
  `last_login_at`       TIMESTAMP    NULL,
  `created_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Games ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `games` (
  `id`              VARCHAR(36)  NOT NULL PRIMARY KEY,
  `name`            VARCHAR(191) NOT NULL,
  `slug`            VARCHAR(191) NOT NULL UNIQUE,
  `description`     TEXT,
  `logo_url`        TEXT,
  `banner_url`      TEXT,
  `category`        VARCHAR(100) NOT NULL DEFAULT 'game_currency',
  `status`          VARCHAR(20)  NOT NULL DEFAULT 'active',
  `is_trending`     TINYINT(1)   NOT NULL DEFAULT 0,
  `instant_delivery`TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`      INT          NOT NULL DEFAULT 0,
  `plugin_slug`     VARCHAR(100),
  `required_fields` VARCHAR(100)          DEFAULT 'userId',
  `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Services ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `services` (
  `id`               VARCHAR(36)      NOT NULL PRIMARY KEY,
  `game_id`          VARCHAR(36)      NOT NULL,
  `name`             VARCHAR(191)     NOT NULL,
  `description`      TEXT,
  `image_url`        TEXT,
  `price`            DECIMAL(10,2)    NOT NULL,
  `discount_percent` DECIMAL(5,2)     NOT NULL DEFAULT 0,
  `final_price`      DECIMAL(10,2)    NOT NULL,
  `currency`         VARCHAR(10)      NOT NULL DEFAULT 'USD',
  `status`           VARCHAR(20)      NOT NULL DEFAULT 'active',
  `sort_order`       INT              NOT NULL DEFAULT 0,
  `plugin_slug`      VARCHAR(100),
  `created_at`       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_services_game` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Products ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `products` (
  `id`               VARCHAR(36)  NOT NULL PRIMARY KEY,
  `title`            VARCHAR(191) NOT NULL,
  `description`      TEXT,
  `category`         ENUM('game_currency','gift_card','voucher','subscription') NOT NULL DEFAULT 'game_currency',
  `image_url`        TEXT,
  `is_active`        TINYINT(1)   NOT NULL DEFAULT 1,
  `instant_delivery` TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`       INT          NOT NULL DEFAULT 0,
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Product Packages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `product_packages` (
  `id`             VARCHAR(36)   NOT NULL PRIMARY KEY,
  `product_id`     VARCHAR(36)   NOT NULL,
  `label`          VARCHAR(191)  NOT NULL,
  `price`          DECIMAL(10,2) NOT NULL,
  `original_price` DECIMAL(10,2),
  `is_active`      TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_packages_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Orders ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `orders` (
  `id`                   VARCHAR(36)   NOT NULL PRIMARY KEY,
  `user_id`              VARCHAR(36),
  `order_number`         VARCHAR(191)  NOT NULL UNIQUE,
  `status`               ENUM('pending','processing','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `total_amount`         DECIMAL(10,2) NOT NULL,
  `currency`             VARCHAR(10)   NOT NULL DEFAULT 'USD',
  `notes`                TEXT,
  `payment_method`       VARCHAR(100),
  `utr`                  VARCHAR(100),
  `payment_verified_at`  TIMESTAMP     NULL,
  `delivery_status`      VARCHAR(50),
  `delivery_note`        TEXT,
  `created_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Order Items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `order_items` (
  `id`            VARCHAR(36)   NOT NULL PRIMARY KEY,
  `order_id`      VARCHAR(36)   NOT NULL,
  `product_id`    VARCHAR(36),
  `package_id`    VARCHAR(36),
  `product_title` VARCHAR(191)  NOT NULL,
  `package_label` VARCHAR(191),
  `quantity`      INT           NOT NULL DEFAULT 1,
  `unit_price`    DECIMAL(10,2) NOT NULL,
  `total_price`   DECIMAL(10,2) NOT NULL,
  CONSTRAINT `fk_items_order`   FOREIGN KEY (`order_id`)   REFERENCES `orders`(`id`)           ON DELETE CASCADE,
  CONSTRAINT `fk_items_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
  CONSTRAINT `fk_items_package` FOREIGN KEY (`package_id`) REFERENCES `product_packages`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Transactions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `transactions` (
  `id`                 VARCHAR(36)   NOT NULL PRIMARY KEY,
  `transaction_number` VARCHAR(50)   NOT NULL UNIQUE,
  `order_id`           VARCHAR(36),
  `user_id`            VARCHAR(36),
  `payment_method`     VARCHAR(100)  NOT NULL,
  `gateway`            VARCHAR(100),
  `gateway_ref`        VARCHAR(191),
  `amount`             DECIMAL(10,2) NOT NULL,
  `currency`           VARCHAR(10)   NOT NULL DEFAULT 'USD',
  `status`             ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
  `failure_reason`     TEXT,
  `is_refund`          TINYINT(1)    NOT NULL DEFAULT 0,
  `created_at`         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at`       TIMESTAMP     NULL,
  `updated_at`         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tx_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
  CONSTRAINT `fk_tx_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Coupons ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `coupons` (
  `id`               VARCHAR(36)   NOT NULL PRIMARY KEY,
  `code`             VARCHAR(100)  NOT NULL UNIQUE,
  `description`      TEXT,
  `discount_type`    VARCHAR(50)   NOT NULL DEFAULT 'percentage',
  `discount_value`   DECIMAL(10,2) NOT NULL,
  `min_order_amount` DECIMAL(10,2),
  `max_uses`         INT,
  `used_count`       INT           NOT NULL DEFAULT 0,
  `is_active`        TINYINT(1)    NOT NULL DEFAULT 1,
  `expires_at`       TIMESTAMP     NULL,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Tickets ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tickets` (
  `id`            VARCHAR(36)  NOT NULL PRIMARY KEY,
  `ticket_number` VARCHAR(50)  NOT NULL UNIQUE,
  `user_id`       VARCHAR(36),
  `subject`       VARCHAR(255) NOT NULL,
  `message`       TEXT         NOT NULL,
  `category`      VARCHAR(100),
  `status`        ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `priority`      ENUM('low','medium','high','urgent')           NOT NULL DEFAULT 'medium',
  `assigned_to`   VARCHAR(36),
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tickets_user`     FOREIGN KEY (`user_id`)     REFERENCES `users`(`id`),
  CONSTRAINT `fk_tickets_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Ticket Replies ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ticket_replies` (
  `id`             VARCHAR(36) NOT NULL PRIMARY KEY,
  `ticket_id`      VARCHAR(36) NOT NULL,
  `user_id`        VARCHAR(36),
  `message`        TEXT        NOT NULL,
  `is_staff`       TINYINT(1)  NOT NULL DEFAULT 0,
  `attachment_url` TEXT,
  `created_at`     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_replies_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_replies_user`   FOREIGN KEY (`user_id`)   REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Campaigns ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id`         VARCHAR(36)  NOT NULL PRIMARY KEY,
  `name`       VARCHAR(191) NOT NULL,
  `description`TEXT,
  `type`       VARCHAR(50)  NOT NULL DEFAULT 'banner',
  `banner_url` TEXT,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `starts_at`  TIMESTAMP    NULL,
  `ends_at`    TIMESTAMP    NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Hero Sliders ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `hero_sliders` (
  `id`                VARCHAR(36)  NOT NULL PRIMARY KEY,
  `title`             VARCHAR(191) NOT NULL,
  `subtitle`          TEXT,
  `banner_url`        TEXT,
  `button_text`       VARCHAR(100),
  `button_link`       VARCHAR(500),
  `linked_game_id`    VARCHAR(36),
  `linked_product_id` VARCHAR(36),
  `starts_at`         TIMESTAMP    NULL,
  `ends_at`           TIMESTAMP    NULL,
  `is_active`         TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`        INT          NOT NULL DEFAULT 0,
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sliders_game`    FOREIGN KEY (`linked_game_id`)    REFERENCES `games`(`id`)    ON DELETE SET NULL,
  CONSTRAINT `fk_sliders_product` FOREIGN KEY (`linked_product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Reviews ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `reviews` (
  `id`          VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id`     VARCHAR(36),
  `product_id`  VARCHAR(36),
  `rating`      INT         NOT NULL,
  `comment`     TEXT,
  `is_approved` TINYINT(1)  NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_reviews_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`),
  CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Payment Methods ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id`                   VARCHAR(36)  NOT NULL PRIMARY KEY,
  `name`                 VARCHAR(191) NOT NULL,
  `type`                 VARCHAR(50)  NOT NULL,
  `payment_type`         VARCHAR(20)  NOT NULL DEFAULT 'CARD',
  `provider`             VARCHAR(100),
  `public_key`           TEXT,
  `secret_key`           TEXT,
  `webhook_secret`       TEXT,
  `mode`                 VARCHAR(20)  NOT NULL DEFAULT 'test',
  `supported_currencies` TEXT,
  `is_active`            TINYINT(1)   NOT NULL DEFAULT 1,
  `config`               TEXT,
  `sort_order`           INT          NOT NULL DEFAULT 0,
  `created_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Plugins ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plugins` (
  `id`              VARCHAR(36)  NOT NULL PRIMARY KEY,
  `slug`            VARCHAR(100) NOT NULL UNIQUE,
  `name`            VARCHAR(191) NOT NULL,
  `description`     TEXT,
  `category`        VARCHAR(50)  NOT NULL DEFAULT 'integration',
  `plugin_type`     VARCHAR(50)           DEFAULT 'integration',
  `version`         VARCHAR(20)           DEFAULT '1.0.0',
  `author`          VARCHAR(191),
  `is_enabled`      TINYINT(1)   NOT NULL DEFAULT 0,
  `config`          TEXT,
  `settings_schema` TEXT,
  `installed_at`    TIMESTAMP    NULL,
  `file_size`       INT,
  `install_path`    VARCHAR(500),
  `status`          VARCHAR(20)  NOT NULL DEFAULT 'inactive',
  `hooks`           TEXT,
  `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Notifications ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         VARCHAR(36)  NOT NULL PRIMARY KEY,
  `type`       VARCHAR(50)  NOT NULL DEFAULT 'info',
  `title`      VARCHAR(191) NOT NULL,
  `message`    TEXT         NOT NULL,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  `metadata`   TEXT,
  `read_at`    TIMESTAMP    NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Email Templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `email_templates` (
  `id`          VARCHAR(36)  NOT NULL PRIMARY KEY,
  `type`        VARCHAR(50)  NOT NULL UNIQUE,
  `name`        VARCHAR(191) NOT NULL,
  `subject`     VARCHAR(500) NOT NULL,
  `title`       VARCHAR(500) NOT NULL,
  `body`        TEXT         NOT NULL,
  `footer_text` VARCHAR(500),
  `button_text` VARCHAR(191),
  `button_link` VARCHAR(500),
  `copy_email`  VARCHAR(191),
  `is_enabled`  TINYINT(1)   NOT NULL DEFAULT 1,
  `styles`      TEXT,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Sessions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`         VARCHAR(36)  NOT NULL PRIMARY KEY,
  `user_id`    VARCHAR(36)  NOT NULL,
  `token`      VARCHAR(255) NOT NULL UNIQUE,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `expires_at` TIMESTAMP    NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Audit Logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`         VARCHAR(36)  NOT NULL PRIMARY KEY,
  `user_id`    VARCHAR(36),
  `action`     VARCHAR(100) NOT NULL,
  `entity`     VARCHAR(100),
  `entity_id`  VARCHAR(36),
  `old_values` TEXT,
  `new_values` TEXT,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_auditlog_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Email Verification Tokens ───────────────────────────────
CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `id`          VARCHAR(36)  NOT NULL PRIMARY KEY,
  `user_id`     VARCHAR(36)  NOT NULL,
  `token`       VARCHAR(255) NOT NULL UNIQUE,
  `expires_at`  TIMESTAMP    NOT NULL,
  `verified_at` TIMESTAMP    NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_evtoken_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Password Reset Tokens ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`           VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id`      VARCHAR(36) NOT NULL,
  `otp_hash`     TEXT        NOT NULL,
  `reset_token`  TEXT,
  `expires_at`   TIMESTAMP   NOT NULL,
  `attempts`     INT         NOT NULL DEFAULT 0,
  `created_at`   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_prtoken_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Site Settings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id`         VARCHAR(36)  NOT NULL PRIMARY KEY,
  `key`        VARCHAR(100) NOT NULL UNIQUE,
  `value`      TEXT,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Fees ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `fees` (
  `id`          VARCHAR(36)   NOT NULL PRIMARY KEY,
  `name`        VARCHAR(100)  NOT NULL,
  `description` TEXT,
  `amount`      DECIMAL(10,2) NOT NULL,
  `type`        VARCHAR(20)   NOT NULL DEFAULT 'fixed',
  `is_active`   TINYINT(1)    NOT NULL DEFAULT 1,
  `sort_order`  INT           NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Busan Config ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `busan_configs` (
  `id`           VARCHAR(36)  NOT NULL PRIMARY KEY,
  `api_token`    VARCHAR(255),
  `api_base_url` VARCHAR(500) NOT NULL DEFAULT 'https://1gamestopup.com/api/v1',
  `currency`     VARCHAR(20)  NOT NULL DEFAULT 'IDR',
  `is_active`    TINYINT(1)   NOT NULL DEFAULT 1,
  `updated_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Busan Mappings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `busan_mappings` (
  `id`                VARCHAR(36)  NOT NULL PRIMARY KEY,
  `cms_product_id`    VARCHAR(36)  NOT NULL,
  `cms_product_name`  VARCHAR(191),
  `busan_product_id`  VARCHAR(191) NOT NULL,
  `busan_product_name`VARCHAR(191),
  `requires_zone`     TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Smile.one Config ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `smile_one_configs` (
  `id`          VARCHAR(36)  NOT NULL PRIMARY KEY,
  `uid`         VARCHAR(191),
  `api_key`     VARCHAR(255),
  `license_key` VARCHAR(255),
  `region`      VARCHAR(50)  NOT NULL DEFAULT 'global',
  `email`       VARCHAR(191),
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Smile.one Mappings ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `smile_one_mappings` (
  `id`                VARCHAR(36)  NOT NULL PRIMARY KEY,
  `cms_product_id`    VARCHAR(36)  NOT NULL,
  `cms_product_name`  VARCHAR(191),
  `smile_product_id`  VARCHAR(191) NOT NULL,
  `smile_product_name`VARCHAR(191),
  `game_slug`         VARCHAR(191) NOT NULL,
  `region`            VARCHAR(50)  NOT NULL DEFAULT 'global',
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── UPI Payment Settings ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `upi_payment_settings` (
  `id`             VARCHAR(36)  NOT NULL PRIMARY KEY,
  `upi_id`         VARCHAR(191),
  `qr_code_url`    TEXT,
  `email_address`  VARCHAR(191),
  `email_password` TEXT,
  `imap_host`      VARCHAR(191) NOT NULL DEFAULT 'imap.gmail.com',
  `imap_port`      INT          NOT NULL DEFAULT 993,
  `is_active`      TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Unmatched Payments ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `unmatched_payments` (
  `id`                    VARCHAR(36)   NOT NULL PRIMARY KEY,
  `amount`                DECIMAL(10,2) NOT NULL,
  `utr`                   VARCHAR(100),
  `sender_name`           VARCHAR(191),
  `email_subject`         VARCHAR(500),
  `raw_body`              TEXT,
  `detected_at`           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_to_order_id`  VARCHAR(36),
  CONSTRAINT `fk_unmatched_order` FOREIGN KEY (`assigned_to_order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Done! Start the app — the admin user will be created automatically.
