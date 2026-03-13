<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
Env::load(__DIR__ . '/../.env');

require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Middleware/AuthMiddleware.php';
require_once __DIR__ . '/../src/Repositories/AbsencesRepository.php';
require_once __DIR__ . '/../src/Repositories/BrasiltecRepository.php';
require_once __DIR__ . '/../src/Repositories/ChecklistsRepository.php';
require_once __DIR__ . '/../src/Repositories/EquipmentsRepository.php';
require_once __DIR__ . '/../src/Repositories/ScrapDirectoryRepository.php';
require_once __DIR__ . '/../src/Repositories/SettingsRepository.php';
require_once __DIR__ . '/../src/Repositories/UsersRepository.php';
require_once __DIR__ . '/../src/Response.php';
require_once __DIR__ . '/../src/Router.php';
require_once __DIR__ . '/../src/Session.php';
require_once __DIR__ . '/../src/StaticServer.php';
require_once __DIR__ . '/../src/UserContext.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$basePath = Config::basePath();

if ($basePath !== '' && str_starts_with($path, $basePath)) {
    $path = substr($path, strlen($basePath));
    $path = $path === '' ? '/' : $path;
}

if (str_starts_with($path, '/api/')) {
    header('Access-Control-Allow-Origin: ' . Config::frontOrigin());
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');

    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    Session::start();
}

$router = new Router();

/**
 * Keep settings payload compatible with frontend expectations.
 *
 * @param mixed $payload
 * @return array<string, mixed>
 */
function normalizeSettingsPayload(mixed $payload): array
{
    $source = is_array($payload) ? $payload : [];
    $normalized = $source;
    unset($normalized['scrapClients'], $normalized['scrapRecipients']);

    $normalized['items'] = isset($source['items']) && is_array($source['items']) ? $source['items'] : [];
    $normalized['equipment'] = isset($source['equipment']) && is_array($source['equipment']) ? $source['equipment'] : [];
    $normalized['absences'] = isset($source['absences']) && is_array($source['absences']) ? $source['absences'] : [];
    $normalized['scrapDirectory'] = [];

    if (isset($source['scrapDirectory']) && is_array($source['scrapDirectory'])) {
        foreach ($source['scrapDirectory'] as $index => $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $client = strtoupper(trim((string) ($entry['client'] ?? '')));
            if ($client === '') {
                continue;
            }

            $recipients = [];
            if (isset($entry['recipients']) && is_array($entry['recipients'])) {
                foreach ($entry['recipients'] as $recipient) {
                    $normalizedRecipient = trim((string) $recipient);
                    if ($normalizedRecipient !== '') {
                        $recipients[] = $normalizedRecipient;
                    }
                }
            }

            $normalized['scrapDirectory'][] = [
                'id' => trim((string) ($entry['id'] ?? '')) !== '' ? (string) $entry['id'] : 'SCRAP-' . ($index + 1),
                'client' => $client,
                'recipients' => array_values(array_unique($recipients)),
                'active' => !array_key_exists('active', $entry) || (bool) $entry['active'],
            ];
        }
    }

    $substitute = isset($source['substitute']) && is_array($source['substitute']) ? $source['substitute'] : [];
    $normalized['substitute'] = [
        'name' => (string) ($substitute['name'] ?? ''),
        'phone' => (string) ($substitute['phone'] ?? ''),
        'isActive' => (bool) ($substitute['isActive'] ?? false),
    ];

    return $normalized;
}

/**
 * @param array<string,mixed> $base
 * @param array<string,mixed> $incoming
 * @return array<string,mixed>
 */
function mergeSettingsPayload(array $base, array $incoming): array
{
    $merged = $base;
    foreach ($incoming as $key => $value) {
        if (
            array_key_exists($key, $merged)
            && is_array($merged[$key])
            && is_array($value)
            && !array_is_list($merged[$key])
            && !array_is_list($value)
        ) {
            $merged[$key] = mergeSettingsPayload($merged[$key], $value);
            continue;
        }
        $merged[$key] = $value;
    }
    return $merged;
}

function normalizeManagerIdInput(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }
    $normalized = trim((string) $value);
    return $normalized === '' ? null : $normalized;
}

function currentManagerId(array $user): ?string
{
    $fromSession = getManagerId($user);
    if ($fromSession !== null) {
        return $fromSession;
    }

    $role = (string) ($user['role'] ?? '');
    $userId = normalizeManagerIdInput($user['id'] ?? null);
    if ($role !== 'OPERATOR' || $userId === null) {
        return null;
    }

    // Session may be stale. Reload managerId from DB for the logged-in operator.
    try {
        $usersRepo = new UsersRepository();
        $dbUser = $usersRepo->findById($userId);
        if (!is_array($dbUser)) {
            return null;
        }

        $managerId = normalizeManagerIdInput($dbUser['managerId'] ?? null);
        return $managerId;
    } catch (Throwable) {
        return null;
    }
}

function isSuperAdmin(array $user): bool
{
    return (string) ($user['id'] ?? '') === '1';
}

$router->get('/api/health', static function (): void {
    $dbEnabled = DB::isEnabled();
    $dbOk = $dbEnabled ? DB::ping() : false;

    Response::json([
        'status' => 'ok',
        'db' => [
            'enabled' => $dbEnabled,
            'ok' => $dbOk,
        ],
    ]);
});

$router->get('/api/auth/me', static function (): void {
    $user = Session::getUser();
    Response::json([
        'authenticated' => $user !== null,
        'user' => $user,
    ]);
});

$router->post('/api/auth/login', static function (): void {
    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '[]', true);

    if (!is_array($payload)) {
        Response::json(['error' => 'Invalid credentials'], 401);
    }

    try {
        $user = Auth::login(
            (string) ($payload['username'] ?? ''),
            (string) ($payload['password'] ?? '')
        );
    } catch (Throwable $e) {
        Response::json(['error' => 'Invalid credentials'], 401);
    }

    Session::setUser($user);
    Response::json([
        'ok' => true,
        'user' => $user,
    ]);
});

$router->post('/api/auth/logout', static function (): void {
    Session::clear();
    Response::json(['ok' => true]);
});

$router->post('/api/auth/forgot-password', static function (): void {
    $repo = new UsersRepository();

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '[]', true);
    if (!is_array($payload)) {
        Response::json(['error' => 'Invalid payload'], 400);
    }

    $email = trim((string) ($payload['email'] ?? ''));
    $newPassword = trim((string) ($payload['newPassword'] ?? ''));
    if ($email === '' || $newPassword === '') {
        Response::json(['error' => 'Email and new password are required'], 400);
    }

    try {
        $target = $repo->findByEmail($email);
        if ($target === null) {
            Response::json(['error' => 'Email not found'], 404);
        }

        $repo->updatePassword((string) $target['id'], $newPassword);
        Response::json(['ok' => true]);
    } catch (InvalidArgumentException) {
        Response::json(['error' => 'Invalid payload'], 400);
    } catch (RuntimeException $e) {
        if (str_contains($e->getMessage(), 'Email field not available')) {
            Response::json(['error' => 'Email not configured'], 500);
        }
        Response::json(['error' => 'Failed to reset password'], 500);
    } catch (Throwable) {
        Response::json(['error' => 'Failed to reset password'], 500);
    }
});

$router->get('/api/auth/protected-test', requireAuth(static function (array $user): void {
    Response::json([
        'ok' => true,
        'user' => $user,
    ]);
}));

$router->get('/api/settings', requireAuth(static function (array $user): void {
    $repo = new SettingsRepository();
    $equipmentsRepo = new EquipmentsRepository();
    $absencesRepo = new AbsencesRepository();
    $scrapDirectoryRepo = new ScrapDirectoryRepository();
    $userManagerId = currentManagerId($user);
    $role = (string) ($user['role'] ?? '');
    $requested = normalizeManagerIdInput($_GET['managerId'] ?? null);

    if ($requested !== null) {
        $targetManagerId = $requested;
        $ownsManager = $userManagerId !== null && $userManagerId === $targetManagerId;
        if ($role !== 'MANAGER' && !$ownsManager) {
            Response::json(['error' => 'Forbidden'], 403);
        }
    } else {
        $targetManagerId = $userManagerId;
    }

    if ($targetManagerId === null) {
        Response::json(['error' => 'Manager ID required'], 400);
    }

    $found = $repo->findByManagerId($targetManagerId);
    $payload = $found['payload'] ?? [];
    $normalized = normalizeSettingsPayload($payload);
    $normalized['equipment'] = $equipmentsRepo->listByManagerId($targetManagerId);
    $normalized['absences'] = $absencesRepo->listByManagerId($targetManagerId);
    $normalized['scrapDirectory'] = $scrapDirectoryRepo->listByManagerId($targetManagerId);
    Response::json($normalized);
}));

$router->post('/api/settings', requireAuth(static function (array $user): void {
    $repo = new SettingsRepository();
    $equipmentsRepo = new EquipmentsRepository();
    $absencesRepo = new AbsencesRepository();
    $scrapDirectoryRepo = new ScrapDirectoryRepository();
    $userManagerId = currentManagerId($user);
    $role = (string) ($user['role'] ?? '');

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '[]', true);
    if (!is_array($payload)) {
        Response::json(['error' => 'Invalid JSON'], 400);
    }

    $requested = normalizeManagerIdInput($payload['managerId'] ?? null);
    if ($requested !== null) {
        $targetManagerId = $requested;
        $ownsManager = $userManagerId !== null && $userManagerId === $targetManagerId;
        if ($role !== 'MANAGER' && !$ownsManager) {
            Response::json(['error' => 'Forbidden'], 403);
        }
    } else {
        $targetManagerId = $userManagerId;
    }

    if ($targetManagerId === null) {
        Response::json(['error' => 'Manager ID required'], 400);
    }

    $settingsPayload = $payload;
    if (isset($payload['updates']) && is_array($payload['updates'])) {
        $settingsPayload = $payload['updates'];
    }
    unset($settingsPayload['managerId']);
    $hasScrapDirectoryUpdate = array_key_exists('scrapDirectory', $settingsPayload);
    $scrapDirectoryPayload = $hasScrapDirectoryUpdate
        ? (normalizeSettingsPayload(['scrapDirectory' => $settingsPayload['scrapDirectory']])['scrapDirectory'] ?? [])
        : [];

    $existing = $repo->findByManagerId($targetManagerId);
    $existingPayload = is_array($existing['payload'] ?? null) ? $existing['payload'] : [];
    $mergedPayload = mergeSettingsPayload($existingPayload, $settingsPayload);
    $normalizedToSave = normalizeSettingsPayload($mergedPayload);
    unset($normalizedToSave['scrapDirectory'], $normalizedToSave['scrapClients'], $normalizedToSave['scrapRecipients']);

    try {
        $saved = $repo->upsert($targetManagerId, $normalizedToSave);
        if (isset($normalizedToSave['equipment']) && is_array($normalizedToSave['equipment'])) {
            $equipmentsRepo->replaceForManager($targetManagerId, $normalizedToSave['equipment']);
        }
        if ($hasScrapDirectoryUpdate) {
            $scrapDirectoryRepo->replaceForManager($targetManagerId, is_array($scrapDirectoryPayload) ? $scrapDirectoryPayload : []);
        }

        $normalizedResponse = normalizeSettingsPayload($saved);
        $normalizedResponse['equipment'] = $equipmentsRepo->listByManagerId($targetManagerId);
        $normalizedResponse['absences'] = $absencesRepo->listByManagerId($targetManagerId);
        $normalizedResponse['scrapDirectory'] = $scrapDirectoryRepo->listByManagerId($targetManagerId);
        Response::json($normalizedResponse);
    } catch (RuntimeException $e) {
        if ($e->getCode() === 403 || str_contains($e->getMessage(), 'Forbidden')) {
            Response::json(['error' => 'Forbidden'], 403);
        }
        Response::json(['error' => 'Failed to save settings'], 500);
    } catch (Throwable) {
        Response::json(['error' => 'Failed to save settings'], 500);
    }
}));

$router->get('/api/users', requireAuth(static function (array $user): void {
    $repo = new UsersRepository();
    if (isSuperAdmin($user)) {
        Response::json($repo->listAll());
    }

    $userManagerId = currentManagerId($user);
    $requested = normalizeManagerIdInput($_GET['managerId'] ?? null);

    if ($requested !== null) {
        $targetManagerId = $requested;
        if ($userManagerId === null || $targetManagerId !== $userManagerId) {
            Response::json(['error' => 'Forbidden'], 403);
        }
    } else {
        $targetManagerId = $userManagerId;
    }

    if ($targetManagerId === null) {
        Response::json(['error' => 'Manager ID required'], 400);
    }

    $users = $repo->listByManagerId($targetManagerId);
    Response::json($users);
}));

$router->get('/api/checklists', requireAuth(static function (array $user): void {
    $repo = new ChecklistsRepository();
    $userManagerId = currentManagerId($user);
    if ($userManagerId === null) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $requested = normalizeManagerIdInput($_GET['managerId'] ?? null);
    if ($requested !== null) {
        $requestedId = $requested;
        if ($requestedId !== $userManagerId) {
            Response::json(['error' => 'Forbidden'], 403);
        }
        $targetManagerId = $requestedId;
    } else {
        $targetManagerId = $userManagerId;
    }

    $items = $repo->listByManagerId($targetManagerId);
    Response::json($items);
}));

$router->post('/api/checklists', requireAuth(static function (array $user): void {
    $repo = new ChecklistsRepository();
    $managerId = currentManagerId($user);
    if ($managerId === null) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '[]', true);
    if (!is_array($payload)) {
        Response::json(['error' => 'Invalid payload'], 400);
    }

    $incomingId = $payload['id'] ?? null;
    if ($incomingId === null || (is_string($incomingId) && trim($incomingId) === '')) {
        Response::json(['error' => 'Checklist id is required'], 400);
    }

    // Compat:
    // - Novo formato: { id, data: {...} }
    // - Legado front: checklist completo no root (sem "data")
    $dataPayload = null;
    if (array_key_exists('data', $payload) && is_array($payload['data'])) {
        $dataPayload = $payload['data'];

        // Frontend may send a flattened checklist object plus the legacy nested "data" object.
        // In that case, root fields represent the latest user edits and must override nested stale values.
        foreach ($payload as $key => $value) {
            if ($key === 'data' || $key === 'managerId') {
                continue;
            }
            $dataPayload[$key] = $value;
        }
    } elseif (!array_key_exists('data', $payload)) {
        $dataPayload = $payload;
    }

    if (!is_array($dataPayload)) {
        Response::json(['error' => 'Checklist data is required'], 400);
    }

    // Enforce root id into persisted JSON to keep consistency.
    $dataPayload['id'] = (string) $incomingId;

    // Manager enforcement (root + nested data).
    $incomingManagerRoot = $payload['managerId'] ?? null;
    $incomingManagerData = $dataPayload['managerId'] ?? null;
    if (
        ($incomingManagerRoot !== null && (string) $incomingManagerRoot !== '' && (string) $incomingManagerRoot !== (string) $managerId)
        || ($incomingManagerData !== null && (string) $incomingManagerData !== '' && (string) $incomingManagerData !== (string) $managerId)
    ) {
        Response::json(['error' => 'Forbidden'], 403);
    }
    $dataPayload['managerId'] = (string) $managerId;

    $upsertPayload = [
        'id' => (string) $incomingId,
        'managerId' => (string) $managerId,
        'data' => $dataPayload,
    ];

    try {
        $saved = $repo->upsert($upsertPayload, (string) $managerId);
        Response::json($saved);
    } catch (InvalidArgumentException $e) {
        if (str_contains($e->getMessage(), 'Checklist id is required')) {
            Response::json(['error' => 'Checklist id is required'], 400);
        }
        if (str_contains($e->getMessage(), 'Checklist data is required')) {
            Response::json(['error' => 'Checklist data is required'], 400);
        }
        Response::json(['error' => 'Invalid payload'], 400);
    } catch (PDOException) {
        Response::json(['error' => 'Failed to save checklist'], 500);
    } catch (RuntimeException $e) {
        if ($e->getCode() === 403 || str_contains($e->getMessage(), 'Forbidden')) {
            Response::json(['error' => 'Forbidden'], 403);
        }
        Response::json(['error' => 'Not found'], 404);
    }
}));

$router->post('/api/users', requireRole(['MANAGER'], static function (array $user): void {
    $repo = new UsersRepository();
    $userManagerId = currentManagerId($user);
    if ($userManagerId === null) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '[]', true);
    if (!is_array($payload)) {
        Response::json(['error' => 'Invalid payload'], 400);
    }

    $payload['managerId'] = $userManagerId;
    try {
        $created = $repo->create($payload);
        Response::json($created);
    } catch (InvalidArgumentException) {
        Response::json(['error' => 'Invalid payload'], 400);
    } catch (RuntimeException $e) {
        if (str_contains($e->getMessage(), 'Email field not available')) {
            Response::json(['error' => 'Email field not available. Run database migrations.'], 500);
        }
        Response::json(['error' => 'Failed to create user'], 500);
    }
}));

$router->put('/api/users/:id', requireRole(['MANAGER'], static function (array $user, array $params): void {
    $repo = new UsersRepository();
    $userManagerId = currentManagerId($user);
    if ($userManagerId === null) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $idParam = $params['id'] ?? null;
    if (!is_string($idParam) || trim($idParam) === '') {
        Response::json(['error' => 'Invalid id'], 400);
    }
    $targetId = trim($idParam);

    $target = $repo->findById($targetId);
    if ($target === null) {
        Response::json(['error' => 'Not found'], 404);
    }
    $superAdmin = isSuperAdmin($user);
    if (!$superAdmin && (string) ($target['managerId'] ?? '') !== (string) $userManagerId) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '[]', true);
    if (!is_array($payload)) {
        Response::json(['error' => 'Invalid payload'], 400);
    }
    if ($superAdmin) {
        if (!array_key_exists('managerId', $payload) || normalizeManagerIdInput($payload['managerId'] ?? null) === null) {
            $payload['managerId'] = $target['managerId'] ?? $userManagerId;
        }
    } else {
        $payload['managerId'] = $userManagerId;
    }

    try {
        $updated = $repo->update($targetId, $payload);
        Response::json($updated);
    } catch (RuntimeException $e) {
        if (str_contains($e->getMessage(), 'Email field not available')) {
            Response::json(['error' => 'Email field not available. Run database migrations.'], 500);
        }
        Response::json(['error' => 'Not found'], 404);
    } catch (InvalidArgumentException) {
        Response::json(['error' => 'Invalid payload'], 400);
    }
}));

$router->delete('/api/users/:id', requireRole(['MANAGER'], static function (array $user, array $params): void {
    $repo = new UsersRepository();
    $userManagerId = currentManagerId($user);
    if ($userManagerId === null) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $idParam = $params['id'] ?? null;
    if (!is_string($idParam) || trim($idParam) === '') {
        Response::json(['error' => 'Invalid id'], 400);
    }
    $targetId = trim($idParam);

    $target = $repo->findById($targetId);
    if ($target === null) {
        Response::json(['error' => 'Not found'], 404);
    }
    if ((string) ($target['managerId'] ?? '') !== (string) $userManagerId) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $repo->delete($targetId);
    Response::json(['ok' => true]);
}));

$router->post('/api/absences', requireRole(['MANAGER'], static function (array $user): void {
    $repo = new AbsencesRepository();
    $managerId = currentManagerId($user);
    if ($managerId === null) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '[]', true);
    if (!is_array($payload)) {
        Response::json(['error' => 'Invalid payload'], 400);
    }

    try {
        $created = $repo->create((string) $managerId, $payload);
        Response::json($created);
    } catch (InvalidArgumentException) {
        Response::json(['error' => 'Invalid payload'], 400);
    }
}));

$router->delete('/api/absences/:id', requireRole(['MANAGER'], static function (array $user, array $params): void {
    $repo = new AbsencesRepository();
    $managerId = currentManagerId($user);
    if ($managerId === null) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $id = $params['id'] ?? null;
    if (!is_string($id) || trim($id) === '') {
        Response::json(['error' => 'Invalid id'], 400);
    }

    $deleted = $repo->delete((string) $managerId, $id);
    if (!$deleted) {
        Response::json(['error' => 'Not found'], 404);
    }

    Response::json(['ok' => true]);
}));

$router->get('/api/brasiltec', requireAuth(static function (array $user): void {
    $repo = new BrasiltecRepository();
    $managerId = currentManagerId($user);
    if ($managerId === null) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $isQualidade = strtoupper(trim((string) ($user['area'] ?? ''))) === 'QUALIDADE';
    $allRequested = (string) ($_GET['all'] ?? '') === '1';
    if ($allRequested && $isQualidade) {
        Response::json($repo->listAll());
    }

    $requested = normalizeManagerIdInput($_GET['managerId'] ?? null);
    if ($requested !== null) {
        if ((string) $requested !== (string) $managerId) {
            Response::json(['error' => 'Forbidden'], 403);
        }
    }

    $items = $repo->listByManagerId((string) $managerId);
    Response::json($items);
}));

$router->post('/api/brasiltec', requireRole(['MANAGER'], static function (array $user): void {
    $repo = new BrasiltecRepository();
    $managerId = currentManagerId($user);
    if ($managerId === null) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '[]', true);
    if (!is_array($payload)) {
        Response::json(['error' => 'Invalid payload'], 400);
    }

    try {
        $created = $repo->create((string) $managerId, $payload);
        Response::json($created);
    } catch (InvalidArgumentException) {
        Response::json(['error' => 'Invalid payload'], 400);
    }
}));

$router->post('/api/brasiltec/validate', requireAuth(static function (array $user): void {
    $repo = new BrasiltecRepository();
    $managerId = currentManagerId($user);
    if ($managerId === null) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '[]', true);
    if (!is_array($payload)) {
        Response::json(['error' => 'Invalid payload'], 400);
    }

    $userId = $payload['userId'] ?? null;
    $password = $payload['password'] ?? null;
    if (!is_string($userId) || trim($userId) === '' || !is_string($password) || $password === '') {
        Response::json(['error' => 'Invalid payload'], 400);
    }

    $isQualidade = strtoupper(trim((string) ($user['area'] ?? ''))) === 'QUALIDADE';
    if ($isQualidade) {
        $ok = $repo->validateCredentialsGlobal(trim($userId), $password);
    } else {
        $ok = $repo->validateCredentials((string) $managerId, trim($userId), $password);
    }
    Response::json(['ok' => $ok]);
}));

$router->delete('/api/brasiltec/:id', requireRole(['MANAGER'], static function (array $user, array $params): void {
    $repo = new BrasiltecRepository();
    $managerId = getManagerId($user);
    if ($managerId === null) {
        Response::json(['error' => 'Forbidden'], 403);
    }

    $id = $params['id'] ?? null;
    if (!is_string($id) || trim($id) === '') {
        Response::json(['error' => 'Invalid id'], 400);
    }

    $deleted = $repo->delete((string) $managerId, $id);
    if (!$deleted) {
        Response::json(['error' => 'Not found'], 404);
    }

    Response::json(['ok' => true]);
}));

if (str_starts_with($path, '/api/')) {
    $router->dispatch($method, $path);
}

if (StaticServer::serve(__DIR__ . '/app', $path)) {
    exit;
}

http_response_code(404);
echo 'Not Found';
