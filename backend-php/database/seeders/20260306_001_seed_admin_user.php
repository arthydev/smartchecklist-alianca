<?php
declare(strict_types=1);

return [
    'name' => '20260306_001_seed_admin_user',
    'description' => 'Seed default ADMIN manager user (idempotent)',
    'run' => static function (PDO $pdo): void {
        $stmt = $pdo->prepare('SELECT `id` FROM `users` WHERE `username` = :username LIMIT 1');
        $stmt->execute(['username' => 'ADMIN']);
        $exists = $stmt->fetch(PDO::FETCH_ASSOC);
        if (is_array($exists)) {
            return;
        }

        $insert = $pdo->prepare(
            'INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `phone`, `manager_id`, `area`)
             VALUES (:id, :name, :username, :password, :role, :phone, :manager_id, :area)'
        );

        $insert->execute([
            'id' => '1',
            'name' => 'Administrador Master',
            'username' => 'ADMIN',
            'password' => password_hash('ADMIN', PASSWORD_DEFAULT),
            'role' => 'MANAGER',
            'phone' => '5511999999999',
            'manager_id' => null,
            'area' => null,
        ]);
    },
];

