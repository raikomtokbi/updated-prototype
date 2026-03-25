-- NEXCOIN MySQL Database Setup
-- Run this on your cPanel MySQL database (nexcoin) before starting the app.

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `username` VARCHAR(191) NOT NULL UNIQUE,
  `email` VARCHAR(191) UNIQUE,
  `password` TEXT NOT NULL,
  `role` ENUM('super_admin','admin','staff','user') NOT NULL DEFAULT 'user',
  `full_name` VARCHAR(191),
  `phone` VARCHAR(50),
  `avatar_url` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_email_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `is_subscribed` TINYINT(1) NOT NULL DEFAULT 0,
  `last_login_at` DATETIME,
  `created_at` DATETIME NOT NULL DEFAULT NOW(),
  `updated_at` DATETIME NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT,
  `category` ENUM('game_currency','gift_card','voucher','subscription') NOT NULL DEFAULT 'game_currency',
  `image_url` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT NOW(),
  `updated_at` DATETIME NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_packages` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `product_id` VARCHAR(36) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `original_price` DECIMAL(10,2),
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36),
  `order_number` VARCHAR(191) NOT NULL UNIQUE,
  `status` ENUM('pending','processing','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `total_amount` DECIMAL(10,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT NOW(),
  `updated_at` DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `order_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36),
  `package_id` VARCHAR(36),
  `product_title` VARCHAR(191) NOT NULL,
  `package_label` VARCHAR(191),
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `total_price` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
  FOREIGN KEY (`package_id`) REFERENCES `product_packages`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `order_id` VARCHAR(36),
  `user_id` VARCHAR(36),
  `payment_method` VARCHAR(100) NOT NULL,
  `gateway` VARCHAR(100),
  `gateway_ref` VARCHAR(191),
  `amount` DECIMAL(10,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `status` ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
  `failure_reason` TEXT,
  `is_refund` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `coupons` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `discount_type` VARCHAR(50) NOT NULL DEFAULT 'percentage',
  `discount_value` DECIMAL(10,2) NOT NULL,
  `min_order_amount` DECIMAL(10,2),
  `max_uses` INT,
  `used_count` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `expires_at` DATETIME,
  `created_at` DATETIME NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tickets` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36),
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `priority` ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `assigned_to` VARCHAR(36),
  `created_at` DATETIME NOT NULL DEFAULT NOW(),
  `updated_at` DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ticket_replies` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `ticket_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36),
  `message` TEXT NOT NULL,
  `is_staff` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT,
  `type` VARCHAR(50) NOT NULL DEFAULT 'banner',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `starts_at` DATETIME,
  `ends_at` DATETIME,
  `created_at` DATETIME NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reviews` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36),
  `product_id` VARCHAR(36),
  `rating` INT NOT NULL,
  `comment` TEXT,
  `is_approved` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `config` TEXT,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
