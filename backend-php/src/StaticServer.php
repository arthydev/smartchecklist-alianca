<?php
declare(strict_types=1);

final class StaticServer
{
    public static function serve(string $publicDir, string $path): bool
    {
        $baseDir = realpath($publicDir);
        if ($baseDir === false) {
            return false;
        }

        $requestPath = parse_url($path, PHP_URL_PATH) ?: '/';
        if ($requestPath === '/') {
            return self::serveFile($baseDir . DIRECTORY_SEPARATOR . 'index.html');
        }

        $relativePath = ltrim($requestPath, '/');
        $candidatePath = $baseDir . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relativePath);
        $resolved = realpath($candidatePath);

        if (
            $resolved !== false &&
            str_starts_with($resolved, $baseDir) &&
            is_file($resolved)
        ) {
            return self::serveFile($resolved);
        }

        return self::serveFile($baseDir . DIRECTORY_SEPARATOR . 'index.html');
    }

    private static function serveFile(string $file): bool
    {
        if (!is_file($file)) {
            return false;
        }

        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $mimeMap = [
            'html' => 'text/html; charset=utf-8',
            'js' => 'application/javascript; charset=utf-8',
            'mjs' => 'application/javascript; charset=utf-8',
            'css' => 'text/css; charset=utf-8',
            'json' => 'application/json; charset=utf-8',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'map' => 'application/json; charset=utf-8',
            'txt' => 'text/plain; charset=utf-8',
        ];

        $contentType = $mimeMap[$ext] ?? 'application/octet-stream';
        header('Content-Type: ' . $contentType);
        readfile($file);
        return true;
    }
}

