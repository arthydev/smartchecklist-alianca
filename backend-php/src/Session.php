<?php
declare(strict_types=1);

final class Session
{
    private const NAME = 'SMARTCHECKLISTSESSID';

    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        $isDev = Config::appEnv() === 'dev';
        session_name(self::NAME);
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => !$isDev,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);

        session_start();
    }

    public static function getUser(): ?array
    {
        $user = $_SESSION['user'] ?? null;
        return is_array($user) ? $user : null;
    }

    public static function setUser(array $user): void
    {
        $allowed = [
            'id' => $user['id'] ?? null,
            'username' => $user['username'] ?? null,
            'name' => $user['name'] ?? null,
            'role' => $user['role'] ?? null,
            'area' => $user['area'] ?? null,
            'managerId' => $user['managerId'] ?? null,
        ];

        $_SESSION['user'] = $allowed;
    }

    public static function clear(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            return;
        }

        $_SESSION = [];
        session_unset();

        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            [
                'expires' => time() - 3600,
                'path' => $params['path'] ?? '/',
                'domain' => $params['domain'] ?? '',
                'secure' => (bool) ($params['secure'] ?? false),
                'httponly' => (bool) ($params['httponly'] ?? true),
                'samesite' => $params['samesite'] ?? 'Lax',
            ]
        );

        session_destroy();
    }
}
