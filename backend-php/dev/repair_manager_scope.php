<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
Env::load(__DIR__ . '/../.env');
require_once __DIR__ . '/../src/DB.php';

/**
 * Usage:
 *   php backend-php/dev/repair_manager_scope.php
 *   php backend-php/dev/repair_manager_scope.php --apply
 *   php backend-php/dev/repair_manager_scope.php --apply --from-manager=1 --to-manager=<MANAGER_ID>
 *   php backend-php/dev/repair_manager_scope.php --apply --skip-managers --from-manager=1 --to-manager=<MANAGER_ID>
 */

$options = parseArgs($argv);
$apply = (bool) ($options['apply'] ?? false);
$skipManagers = (bool) ($options['skip-managers'] ?? false);
$fromManager = isset($options['from-manager']) ? trim((string) $options['from-manager']) : null;
$toManager = isset($options['to-manager']) ? trim((string) $options['to-manager']) : null;

if (($fromManager === null) xor ($toManager === null)) {
    fwrite(STDERR, "Erro: use --from-manager e --to-manager juntos.\n");
    exit(1);
}

$pdo = DB::get();
$usersTable = envOrDefault('USERS_TABLE', 'users');
$idField = resolveField($pdo, $usersTable, [envOrDefault('USERS_ID_FIELD', 'id'), 'id']) ?? 'id';
$roleField = resolveField($pdo, $usersTable, [envOrDefault('USERS_ROLE_FIELD', 'role'), 'role']) ?? 'role';
$managerField = resolveField($pdo, $usersTable, [envOrDefault('USERS_MANAGER_FIELD', 'managerId'), 'manager_id', 'managerId']);

if ($managerField === null) {
    fwrite(STDERR, "Erro: coluna manager_id/managerId nao encontrada na tabela users.\n");
    exit(1);
}

$summary = [
    'apply' => $apply,
    'table' => $usersTable,
    'fields' => [
        'id' => $idField,
        'role' => $roleField,
        'manager' => $managerField,
    ],
    'fixManagers' => [
        'enabled' => !$skipManagers,
        'wouldUpdate' => 0,
        'updated' => 0,
    ],
    'remapOperators' => [
        'enabled' => ($fromManager !== null && $toManager !== null),
        'from' => $fromManager,
        'to' => $toManager,
        'wouldUpdate' => 0,
        'updated' => 0,
    ],
];

try {
    if ($apply) {
        $pdo->beginTransaction();
    }

    if (!$skipManagers) {
        $countSql = sprintf(
            "SELECT COUNT(*) AS c FROM `%s` WHERE `%s` = 'MANAGER' AND (`%s` IS NULL OR `%s` <> `%s`)",
            $usersTable,
            $roleField,
            $managerField,
            $managerField,
            $idField
        );
        $count = (int) (($pdo->query($countSql)->fetch(PDO::FETCH_ASSOC)['c'] ?? 0));
        $summary['fixManagers']['wouldUpdate'] = $count;

        if ($apply && $count > 0) {
            $updateSql = sprintf(
                "UPDATE `%s` SET `%s` = `%s` WHERE `%s` = 'MANAGER' AND (`%s` IS NULL OR `%s` <> `%s`)",
                $usersTable,
                $managerField,
                $idField,
                $roleField,
                $managerField,
                $managerField,
                $idField
            );
            $updated = $pdo->exec($updateSql);
            $summary['fixManagers']['updated'] = is_int($updated) ? $updated : 0;
        }
    }

    if ($fromManager !== null && $toManager !== null) {
        $countStmt = $pdo->prepare(sprintf(
            "SELECT COUNT(*) AS c FROM `%s` WHERE `%s` <> 'MANAGER' AND `%s` = :fromManager",
            $usersTable,
            $roleField,
            $managerField
        ));
        $countStmt->execute(['fromManager' => $fromManager]);
        $count = (int) (($countStmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0));
        $summary['remapOperators']['wouldUpdate'] = $count;

        if ($apply && $count > 0) {
            $updateStmt = $pdo->prepare(sprintf(
                "UPDATE `%s` SET `%s` = :toManager WHERE `%s` <> 'MANAGER' AND `%s` = :fromManager",
                $usersTable,
                $managerField,
                $roleField,
                $managerField
            ));
            $updateStmt->execute([
                'toManager' => $toManager,
                'fromManager' => $fromManager,
            ]);
            $summary['remapOperators']['updated'] = $updateStmt->rowCount();
        }
    }

    if ($apply) {
        $pdo->commit();
    }
} catch (Throwable $e) {
    if ($apply && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), PHP_EOL;
    exit(1);
}

echo json_encode([
    'ok' => true,
    'summary' => $summary,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), PHP_EOL;

function envOrDefault(string $key, string $default): string
{
    $value = getenv($key);
    if ($value === false) {
        return $default;
    }
    $trimmed = trim((string) $value);
    return $trimmed === '' ? $default : $trimmed;
}

function parseArgs(array $argv): array
{
    $result = [];
    foreach ($argv as $index => $arg) {
        if ($index === 0) {
            continue;
        }
        if ($arg === '--apply') {
            $result['apply'] = true;
            continue;
        }
        if ($arg === '--skip-managers') {
            $result['skip-managers'] = true;
            continue;
        }
        if (str_starts_with($arg, '--from-manager=')) {
            $result['from-manager'] = substr($arg, strlen('--from-manager='));
            continue;
        }
        if (str_starts_with($arg, '--to-manager=')) {
            $result['to-manager'] = substr($arg, strlen('--to-manager='));
            continue;
        }
    }
    return $result;
}

function resolveField(PDO $pdo, string $table, array $candidates): ?string
{
    $stmt = $pdo->query(sprintf('SHOW COLUMNS FROM `%s`', str_replace('`', '', $table)));
    $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
    $columns = [];
    foreach ($rows as $row) {
        if (isset($row['Field'])) {
            $columns[(string) $row['Field']] = true;
        }
    }

    foreach ($candidates as $candidate) {
        $clean = str_replace('`', '', (string) $candidate);
        if (isset($columns[$clean])) {
            return $clean;
        }
    }

    return null;
}
