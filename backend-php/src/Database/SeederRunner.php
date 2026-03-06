<?php
declare(strict_types=1);

final class SeederRunner
{
    private PDO $pdo;
    private string $seedersPath;

    public function __construct(PDO $pdo, string $seedersPath)
    {
        $this->pdo = $pdo;
        $this->seedersPath = rtrim($seedersPath, DIRECTORY_SEPARATOR);
    }

    public function seed(): array
    {
        $this->ensureTable();
        $applied = $this->appliedSeeds();
        $files = $this->seedFiles();
        $ran = [];

        foreach ($files as $file) {
            $seed = $this->loadSeed($file);
            $name = (string) ($seed['name'] ?? '');
            if ($name === '' || isset($applied[$name])) {
                continue;
            }

            $run = $seed['run'] ?? null;
            if (!is_callable($run)) {
                throw new RuntimeException("Invalid seeder run() in file: {$file}");
            }

            $this->pdo->beginTransaction();
            try {
                $run($this->pdo);
                $stmt = $this->pdo->prepare('INSERT INTO `_seed_runs` (`name`, `description`, `applied_at`) VALUES (:n, :d, NOW())');
                $stmt->execute([
                    'n' => $name,
                    'd' => (string) ($seed['description'] ?? ''),
                ]);
                $this->pdo->commit();
            } catch (Throwable $e) {
                $this->pdo->rollBack();
                throw $e;
            }

            $ran[] = $name;
        }

        return $ran;
    }

    private function ensureTable(): void
    {
        $sql = <<<SQL
CREATE TABLE IF NOT EXISTS `_seed_runs` (
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(255) NULL,
  `applied_at` DATETIME NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL;
        $this->pdo->exec($sql);
    }

    /** @return array<string, bool> */
    private function appliedSeeds(): array
    {
        $rows = $this->pdo->query('SELECT `name` FROM `_seed_runs`')->fetchAll(PDO::FETCH_ASSOC);
        $result = [];
        foreach ($rows as $row) {
            if (is_array($row) && isset($row['name'])) {
                $result[(string) $row['name']] = true;
            }
        }
        return $result;
    }

    /** @return array<int, string> */
    private function seedFiles(): array
    {
        $files = glob($this->seedersPath . DIRECTORY_SEPARATOR . '*.php');
        if ($files === false) {
            return [];
        }
        sort($files, SORT_STRING);
        return $files;
    }

    /** @return array<string, mixed> */
    private function loadSeed(string $file): array
    {
        $seed = require $file;
        if (!is_array($seed)) {
            throw new RuntimeException("Invalid seed file: {$file}");
        }
        return $seed;
    }
}

