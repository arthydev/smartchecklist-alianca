<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
Env::load(__DIR__ . '/../.env');

require_once __DIR__ . '/../src/DB.php';
require_once __DIR__ . '/../src/Database/SeederRunner.php';

/**
 * @return array<int, string>
 */
function resetTableOrder(): array
{
    return [
        'scrap_client_recipients',
        'scrap_clients',
        'checklists',
        'absences',
        'equipments',
        'brasiltec_users',
        'settings',
        'users',
    ];
}

function tableExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare('SHOW TABLES LIKE :table');
    $stmt->execute(['table' => $table]);
    return is_array($stmt->fetch(PDO::FETCH_NUM));
}

function ensureSeedRunsTable(PDO $pdo): void
{
    $sql = <<<SQL
CREATE TABLE IF NOT EXISTS `_seed_runs` (
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(255) NULL,
  `applied_at` DATETIME NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL;
    $pdo->exec($sql);
}

function assertAdminExists(PDO $pdo): void
{
    $stmt = $pdo->prepare('SELECT `id` FROM `users` WHERE `username` = :username LIMIT 1');
    $stmt->execute(['username' => 'ADMIN']);
    $exists = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!is_array($exists) || trim((string) ($exists['id'] ?? '')) === '') {
        throw new RuntimeException('ADMIN user was not recreated by the seeder.');
    }
}

try {
    $pdo = DB::get();
    echo "Iniciando limpeza do banco...\n";

    $pdo->beginTransaction();
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

    try {
        foreach (resetTableOrder() as $table) {
            if (!tableExists($pdo, $table)) {
                continue;
            }

            $pdo->exec(sprintf('DELETE FROM `%s`', str_replace('`', '', $table)));
            echo "- Tabela limpa: {$table}\n";
        }

        ensureSeedRunsTable($pdo);
        $pdo->exec('DELETE FROM `_seed_runs`');
        echo "- Tabela limpa: _seed_runs\n";

        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
        $pdo->rollBack();
        throw $e;
    }

    echo "Reaplicando seed do ADMIN...\n";
    $runner = new SeederRunner($pdo, __DIR__ . '/../database/seeders');
    $runner->seed();
    assertAdminExists($pdo);

    echo "Reset concluido com sucesso. Banco limpo e usuario ADMIN recriado.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Reset error: " . $e->getMessage() . PHP_EOL);
    exit(1);
}
