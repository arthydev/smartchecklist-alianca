<?php
declare(strict_types=1);

final class Migrator
{
    private PDO $pdo;
    private string $migrationsPath;

    public function __construct(PDO $pdo, string $migrationsPath)
    {
        $this->pdo = $pdo;
        $this->migrationsPath = rtrim($migrationsPath, DIRECTORY_SEPARATOR);
    }

    public function migrate(): array
    {
        $this->ensureTable();
        $applied = $this->appliedVersions();
        $files = $this->migrationFiles();
        $ran = [];

        foreach ($files as $file) {
            $migration = $this->loadMigration($file);
            $version = (string) ($migration['version'] ?? '');
            if ($version === '' || isset($applied[$version])) {
                continue;
            }

            $up = $migration['up'] ?? null;
            if (!is_callable($up)) {
                throw new RuntimeException("Invalid migration up() in file: {$file}");
            }

            try {
                $up($this->pdo);
                $stmt = $this->pdo->prepare('INSERT INTO `_migrations` (`version`, `description`, `applied_at`) VALUES (:v, :d, NOW())');
                $stmt->execute([
                    'v' => $version,
                    'd' => (string) ($migration['description'] ?? ''),
                ]);
            } catch (Throwable $e) {
                throw $e;
            }

            $ran[] = $version;
        }

        return $ran;
    }

    private function ensureTable(): void
    {
        $sql = <<<SQL
CREATE TABLE IF NOT EXISTS `_migrations` (
  `version` VARCHAR(191) NOT NULL,
  `description` VARCHAR(255) NULL,
  `applied_at` DATETIME NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL;
        $this->pdo->exec($sql);
    }

    /** @return array<string, bool> */
    private function appliedVersions(): array
    {
        $rows = $this->pdo->query('SELECT `version` FROM `_migrations`')->fetchAll(PDO::FETCH_ASSOC);
        $result = [];
        foreach ($rows as $row) {
            if (is_array($row) && isset($row['version'])) {
                $result[(string) $row['version']] = true;
            }
        }
        return $result;
    }

    /** @return array<int, string> */
    private function migrationFiles(): array
    {
        $files = glob($this->migrationsPath . DIRECTORY_SEPARATOR . '*.php');
        if ($files === false) {
            return [];
        }
        sort($files, SORT_STRING);
        return $files;
    }

    /** @return array<string, mixed> */
    private function loadMigration(string $file): array
    {
        $migration = require $file;
        if (!is_array($migration)) {
            throw new RuntimeException("Invalid migration file: {$file}");
        }
        return $migration;
    }
}
