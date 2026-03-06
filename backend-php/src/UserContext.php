<?php
declare(strict_types=1);

function getManagerId(array $user): ?string
{
    $role = (string) ($user['role'] ?? '');
    if ($role === 'MANAGER') {
        $id = $user['id'] ?? null;
        if ($id !== null && $id !== '') {
            return (string) $id;
        }
    }

    $managerId = $user['managerId'] ?? null;
    if ($managerId !== null && $managerId !== '') {
        return (string) $managerId;
    }

    return null;
}

function normalizeUserForSession(array $user): array
{
    $idRaw = $user['id'] ?? null;
    $id = null;
    if ($idRaw !== null && $idRaw !== '') {
        $id = is_numeric((string) $idRaw) ? (int) $idRaw : (string) $idRaw;
    }
    $username = (string) ($user['username'] ?? '');
    $name = trim((string) ($user['name'] ?? ''));
    if ($name === '') {
        $name = $username;
    }

    $normalized = [
        'id' => $id,
        'username' => $username,
        'name' => $name,
        'role' => (string) ($user['role'] ?? ''),
        'area' => isset($user['area']) && $user['area'] !== null ? (string) $user['area'] : null,
        'managerId' => null,
    ];

    // Use raw user as precedence to avoid null-overwrite from normalized defaults.
    $normalized['managerId'] = getManagerId($user + $normalized);
    return $normalized;
}
