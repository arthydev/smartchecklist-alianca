<?php
declare(strict_types=1);

require_once __DIR__ . '/Repositories/UserRepository.php';
require_once __DIR__ . '/UserContext.php';

final class Auth
{
    public static function login(string $username, string $password): array
    {
        $username = trim($username);
        $password = trim($password);

        if ($username === '' || $password === '') {
            throw new RuntimeException('Invalid credentials', 401);
        }

        $repo = new UserRepository();
        $user = $repo->findByUsername($username);

        if ($user === null || !is_string($user['password'] ?? null)) {
            throw new RuntimeException('Invalid credentials', 401);
        }

        $stored = (string) $user['password'];
        $valid = self::verifyPassword($password, $stored);
        if (!$valid) {
            throw new RuntimeException('Invalid credentials', 401);
        }

        return normalizeUserForSession([
            'id' => $user['id'] ?? null,
            'username' => $user['username'] ?? null,
            'name' => $user['name'] ?? null,
            'role' => $user['role'] ?? null,
            'area' => $user['area'] ?? null,
            'managerId' => $user['managerId'] ?? null,
        ]);
    }

    private static function verifyPassword(string $plain, string $stored): bool
    {
        $info = password_get_info($stored);
        $isHash = isset($info['algo']) && $info['algo'] !== null && $info['algo'] !== 0;

        if ($isHash) {
            return password_verify($plain, $stored);
        }

        return hash_equals($stored, $plain);
    }
}
