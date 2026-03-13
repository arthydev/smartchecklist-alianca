<?php
declare(strict_types=1);

return [
    'version' => '20260311_002_create_scrap_directory_tables',
    'description' => 'Create relational tables for scrap clients and recipients',
    'up' => static function (PDO $pdo): void {
        $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS `scrap_clients` (
  `id` VARCHAR(36) NOT NULL,
  `manager_id` VARCHAR(36) NOT NULL,
  `client_name` VARCHAR(255) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_scrap_clients_manager_name` (`manager_id`, `client_name`),
  KEY `idx_scrap_clients_manager_id` (`manager_id`),
  CONSTRAINT `fk_scrap_clients_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
SQL);

        $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS `scrap_client_recipients` (
  `id` VARCHAR(36) NOT NULL,
  `scrap_client_id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_scrap_client_recipient` (`scrap_client_id`, `email`),
  KEY `idx_scrap_client_recipients_client_id` (`scrap_client_id`),
  CONSTRAINT `fk_scrap_client_recipients_client` FOREIGN KEY (`scrap_client_id`) REFERENCES `scrap_clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
SQL);
    },
];
