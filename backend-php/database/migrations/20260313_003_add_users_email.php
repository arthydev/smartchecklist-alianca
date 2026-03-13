<?php
declare(strict_types=1);

return [
    'version' => '20260313_003_add_users_email',
    'description' => 'Add email column and unique index to users table',
    'up' => static function (PDO $pdo): void {
        $columns = $pdo->query('SHOW COLUMNS FROM `users`')->fetchAll(PDO::FETCH_ASSOC);
        $hasEmail = false;
        foreach ($columns as $column) {
            if (($column['Field'] ?? null) === 'email') {
                $hasEmail = true;
                break;
            }
        }

        if (!$hasEmail) {
            $pdo->exec('ALTER TABLE `users` ADD COLUMN `email` VARCHAR(255) NULL AFTER `password`');
        }

        $indexes = $pdo->query('SHOW INDEX FROM `users`')->fetchAll(PDO::FETCH_ASSOC);
        $hasUniqueEmailIndex = false;
        foreach ($indexes as $index) {
            if (($index['Key_name'] ?? null) === 'uniq_users_email') {
                $hasUniqueEmailIndex = true;
                break;
            }
        }

        if (!$hasUniqueEmailIndex) {
            $pdo->exec('ALTER TABLE `users` ADD UNIQUE KEY `uniq_users_email` (`email`)');
        }
    },
];
