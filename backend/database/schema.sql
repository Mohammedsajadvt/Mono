-- ==========================================================
-- Database Schema for Mono Income & Expense Tracker
-- Database: mono_db
-- Compatible with: MySQL 5.7+, MySQL 8.0+, MariaDB (XAMPP)
-- ==========================================================

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS `mono_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `mono_db`;

-- Disable foreign key checks for clean re-creation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `send_again_contacts`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- 2. Users Table (Authentication with JWT + bcrypt)
-- ==========================================================
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 3. Categories / Expense Names Table
-- (Populates the Add Expense NAME dropdown & Categories screen)
-- ==========================================================
CREATE TABLE `categories` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED DEFAULT NULL COMMENT 'NULL for global defaults, user_id for custom categories',
  `name` VARCHAR(80) NOT NULL,
  `icon` VARCHAR(50) NOT NULL DEFAULT 'movie_outlined',
  `color` VARCHAR(20) NOT NULL DEFAULT '#438883',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_categories_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 4. Transactions Table
-- (Income & Expense entries shown on Home, Statistics & Add Expense)
-- ==========================================================
CREATE TABLE `transactions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `category_id` INT UNSIGNED DEFAULT NULL,
  `title` VARCHAR(120) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL DEFAULT 'expense',
  `amount` DECIMAL(12, 2) NOT NULL,
  `transaction_date` DATE NOT NULL,
  `invoice_url` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  INDEX `idx_transactions_user_date` (`user_id`, `transaction_date`),
  INDEX `idx_transactions_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 5. Send Again Contacts Table (Home Screen Avatars)
-- ==========================================
CREATE TABLE `send_again_contacts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 6. Admin Users Table (Enterprise Console)
-- ==========================================================
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(80) NOT NULL UNIQUE,
  `email` VARCHAR(150) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_admin_email` (`email`),
  INDEX `idx_admin_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 7. Password Resets Table (Secure 6-digit Email OTPs)
-- ==========================================================
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL,
  `otp_code` VARCHAR(10) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_password_resets_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 8. Initial Seed Data
-- ==========================================================

-- Insert Demo User (Password is 'password123' hashed with bcrypt)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `avatar_url`) VALUES
(1, 'Enjelin Morgeana', 'enjelin@example.com', '$2b$10$wO7bC/6pC5z8vFhN8FjVbeX9fA3rG2D6XhM1oT7lW0qR9sN1zO1a.', NULL);

-- Insert Default Categories (Available in Add Expense dropdown)
INSERT INTO `categories` (`id`, `user_id`, `name`, `icon`, `color`) VALUES
(1, NULL, 'Netflix', 'movie_outlined', '#E50914'),
(2, NULL, 'Starbucks', 'coffee_rounded', '#00704A'),
(3, NULL, 'Grocery', 'shopping_bag_outlined', '#FFA000'),
(4, NULL, 'Transfer', 'swap_horiz_rounded', '#7B1FA2'),
(5, NULL, 'Paypal', 'payment_rounded', '#0079C1'),
(6, NULL, 'Youtube', 'play_circle_fill', '#FF0000'),
(7, NULL, 'Spotify', 'music_note_rounded', '#1DB954'),
(8, NULL, 'Utilities', 'bolt_rounded', '#F57C00');

-- Insert Initial Demo Transactions (Matches Balance: $2,548.00 | Income: $1,840.00 | Expenses: $284.00)
INSERT INTO `transactions` (`user_id`, `category_id`, `title`, `type`, `amount`, `transaction_date`) VALUES
(1, NULL, 'Upwork', 'income', 850.00, CURDATE()),
(1, 4, 'Transfer', 'expense', 85.00, DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
(1, 5, 'Paypal', 'income', 1406.00, '2022-01-30'),
(1, 6, 'Youtube', 'expense', 11.99, '2022-01-16'),
(1, 2, 'Starbucks', 'expense', 150.00, '2022-01-12');

-- Insert Demo Send Again Contacts
INSERT INTO `send_again_contacts` (`user_id`, `name`, `avatar_url`) VALUES
(1, 'Jessica', NULL),
(1, 'Alex', NULL),
(1, 'Sarah', NULL),
(1, 'David', NULL),
(1, 'Emily', NULL);


-- ==========================================================
-- 9. Receipts Table (AI-Powered Receipt & Bill Scanner)
-- ==========================================================
CREATE TABLE IF NOT EXISTS `receipts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `merchant` VARCHAR(150) NULL,
  `receipt_date` DATE NULL,
  `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `tax_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(50) NULL,
  `suggested_category` VARCHAR(100) NULL,
  `category_id` INT UNSIGNED NULL,
  `image_url` VARCHAR(255) NULL,
  `image_hash` VARCHAR(64) NULL,
  `confidence` DECIMAL(4, 2) NOT NULL DEFAULT 0.90,
  `raw_items` JSON NULL,
  `status` ENUM('pending', 'confirmed', 'discarded') NOT NULL DEFAULT 'pending',
  `transaction_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_receipts_user` (`user_id`),
  INDEX `idx_receipts_status` (`status`),
  INDEX `idx_receipts_hash` (`user_id`, `image_hash`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
