<?php
declare(strict_types=1);

return [
    'version' => '20260306_001_create_core_tables',
    'description' => 'Create core tables for SmartChecklist PHP backend',
    'up' => static function (PDO $pdo): void {
        $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `manager_id` VARCHAR(36) NULL,
  `area` VARCHAR(50) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_username` (`username`),
  KEY `idx_users_manager_id` (`manager_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL);

        $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS `checklists` (
  `id` VARCHAR(36) NOT NULL,
  `manager_id` VARCHAR(36) NOT NULL,
  `date` DATE NOT NULL,
  `equipment_no` VARCHAR(50) NULL,
  `shift` VARCHAR(20) NULL,
  `approval_status` VARCHAR(20) NULL,
  `data` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  PRIMARY KEY (`id`),
  KEY `idx_checklists_manager_id` (`manager_id`),
  CONSTRAINT `fk_checklists_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL);

        $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS `settings` (
  `manager_id` VARCHAR(36) NOT NULL,
  `items` JSON NULL,
  `substitute` JSON NULL,
  `scrap_recipients` JSON NULL,
  `scrap_clients` JSON NULL,
  PRIMARY KEY (`manager_id`),
  CONSTRAINT `fk_settings_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL);

        $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS `equipments` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `type` VARCHAR(50) NULL,
  `manager_id` VARCHAR(36) NULL,
  `category` VARCHAR(50) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_equipments_manager_id` (`manager_id`),
  CONSTRAINT `fk_equipments_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL);

        $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS `absences` (
  `id` VARCHAR(36) NOT NULL,
  `entity_id` VARCHAR(36) NULL,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `reason` VARCHAR(50) NULL,
  `manager_id` VARCHAR(36) NULL,
  `type` VARCHAR(20) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_absences_manager_id` (`manager_id`),
  CONSTRAINT `fk_absences_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL);

        $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS `brasiltec_users` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `manager_id` VARCHAR(36) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_brasiltec_manager_id` (`manager_id`),
  CONSTRAINT `fk_brasiltec_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL);
    },
];

