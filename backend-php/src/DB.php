<?php
declare(strict_types=1);

final class DB
{
    private static ?PDO $pdo = null;

    public static function get(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $host = self::env('DB_HOST', '127.0.0.1');
        $port = self::env('DB_PORT', '3306');
        $name = self::env('DB_NAME', '');
        $user = self::env('DB_USER', 'root');
        $pass = self::env('DB_PASS', '');

        if ($name === '') {
            throw new RuntimeException('Database disabled: DB_NAME is empty.');
        }

        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);

        self::$pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        return self::$pdo;
    }

    public static function ping(): bool
    {
        if (!self::isEnabled()) {
            return false;
        }

        try {
            $stmt = self::get()->query('SELECT 1');
            return $stmt !== false;
        } catch (Throwable) {
            return false;
        }
    }

    public static function isEnabled(): bool
    {
        return self::env('DB_NAME', '') !== '';
    }

    private static function env(string $key, string $default): string
    {
        $value = getenv($key);
        if ($value === false) {
            return $default;
        }

        $trimmed = trim((string) $value);
        return $trimmed === '' ? $default : $trimmed;
    }
}

