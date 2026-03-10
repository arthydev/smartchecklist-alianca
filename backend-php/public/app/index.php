<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Response.php';

Config::bootstrap();

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header('Access-Control-Allow-Origin: ' . $origin);
header('Vary: Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$basePath = rtrim((string) Config::get('BASE_PATH', ''), '/');

if ($basePath !== '' && str_starts_with($uri, $basePath)) {
    $uri = substr($uri, strlen($basePath));
    if ($uri === '') {
        $uri = '/';
    }
}

if ($uri === '/api/health' && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    try {
        DB::connection()->query('SELECT 1');
        Response::json(['status' => 'ok', 'database' => 'connected']);
    } catch (Throwable $e) {
        Response::json(
            ['status' => 'error', 'database' => 'disconnected', 'error' => $e->getMessage()],
            500
        );
    }
}

if (str_starts_with($uri, '/api/')) {
    Response::json(['error' => 'Not found'], 404);
}

http_response_code(404);
echo 'Not Found';

