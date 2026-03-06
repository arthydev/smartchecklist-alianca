<?php
declare(strict_types=1);

final class Config
{
    public static function appEnv(): string
    {
        $value = getenv('APP_ENV');
        return is_string($value) && $value !== '' ? $value : 'dev';
    }

    public static function basePath(): string
    {
        $value = getenv('BASE_PATH');
        if (!is_string($value) || $value === '') {
            return '';
        }

        $trimmed = trim($value);
        if ($trimmed === '' || $trimmed === '/') {
            return '';
        }

        return '/' . trim($trimmed, '/');
    }

    public static function frontOrigin(): string
    {
        $value = getenv('FRONT_ORIGIN');
        return is_string($value) && $value !== '' ? $value : 'http://localhost:5173';
    }
}

