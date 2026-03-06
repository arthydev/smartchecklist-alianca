<?php
declare(strict_types=1);

require_once __DIR__ . '/../Response.php';
require_once __DIR__ . '/../Session.php';

function requireAuth(callable $handler): callable
{
    return static function (...$args) use ($handler): void {
        $user = Session::getUser();
        if ($user === null) {
            Response::json(['error' => 'Unauthorized'], 401);
        }

        $handler($user, ...$args);
    };
}

function requireRole(array $roles, callable $handler): callable
{
    return requireAuth(static function (array $user, ...$args) use ($roles, $handler): void {
        $role = (string) ($user['role'] ?? '');
        if (!in_array($role, $roles, true)) {
            Response::json(['error' => 'Forbidden'], 403);
        }

        $handler($user, ...$args);
    });
}
