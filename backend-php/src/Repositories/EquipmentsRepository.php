<?php
declare(strict_types=1);

require_once __DIR__ . '/../DB.php';

final class EquipmentsRepository
{
    /** @var array<string, bool>|null */
    private ?array $columns = null;
    private ?bool $tableExistsCache = null;

    /** @return array<int, array<string,mixed>> */
    public function listByManagerId(string|int $managerId): array
    {
        if (!$this->tableExists()) {
            return [];
        }

        $sql = sprintf(
            'SELECT * FROM `%s` WHERE `%s` = :managerId',
            $this->table(),
            $this->managerField()
        );
        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['managerId' => (string) $managerId]);
        $rows = $stmt->fetchAll();

        $result = [];
        foreach ($rows as $row) {
            if (is_array($row)) {
                $result[] = $this->mapRow($row, $managerId);
            }
        }
        return $result;
    }

    /** @param array<int, array<string,mixed>> $equipments */
    public function replaceForManager(string|int $managerId, array $equipments): void
    {
        if (!$this->tableExists()) {
            return;
        }

        $keptIds = [];
        foreach ($equipments as $item) {
            if (!is_array($item)) {
                continue;
            }

            $id = trim((string) ($item['id'] ?? ''));
            $code = trim((string) ($item['code'] ?? ''));
            if ($id === '' || $code === '') {
                continue;
            }

            $keptIds[] = $id;
            $this->upsertOne($managerId, $item);
        }

        if (count($keptIds) === 0) {
            $sql = sprintf(
                'DELETE FROM `%s` WHERE `%s` = :managerId',
                $this->table(),
                $this->managerField()
            );
            $stmt = DB::get()->prepare($sql);
            $stmt->execute(['managerId' => (string) $managerId]);
            return;
        }

        $placeholders = [];
        $params = ['managerId' => (string) $managerId];
        foreach ($keptIds as $index => $id) {
            $key = 'id' . $index;
            $placeholders[] = ':' . $key;
            $params[$key] = $id;
        }

        $sql = sprintf(
            'DELETE FROM `%s` WHERE `%s` = :managerId AND `%s` NOT IN (%s)',
            $this->table(),
            $this->managerField(),
            $this->idField(),
            implode(', ', $placeholders)
        );
        $stmt = DB::get()->prepare($sql);
        $stmt->execute($params);
    }

    /** @param array<string,mixed> $item */
    private function upsertOne(string|int $managerId, array $item): void
    {
        $id = trim((string) ($item['id'] ?? ''));
        $code = trim((string) ($item['code'] ?? ''));
        if ($id === '' || $code === '') {
            return;
        }

        $updates = [
            $this->codeField() => $code,
            $this->managerField() => (string) $managerId,
        ];

        $descriptionField = $this->descriptionField();
        if ($descriptionField !== null) {
            $updates[$descriptionField] = (string) ($item['description'] ?? '');
        }

        $activeField = $this->activeField();
        if ($activeField !== null) {
            $updates[$activeField] = ((bool) ($item['active'] ?? true)) ? 1 : 0;
        }

        $typeField = $this->typeField();
        if ($typeField !== null) {
            $updates[$typeField] = (string) ($item['type'] ?? 'PRIMARY');
        }

        $categoryField = $this->categoryField();
        if ($categoryField !== null) {
            $updates[$categoryField] = (string) ($item['category'] ?? '');
        }

        $setSql = [];
        foreach ($updates as $field => $_value) {
            $setSql[] = sprintf('`%s` = :%s', $field, $field);
        }

        $updateParams = $updates;
        $updateParams['id'] = $id;
        $updateParams['managerFilter'] = (string) $managerId;

        $updateSql = sprintf(
            'UPDATE `%s` SET %s WHERE `%s` = :id AND `%s` = :managerFilter',
            $this->table(),
            implode(', ', $setSql),
            $this->idField(),
            $this->managerField()
        );
        $updateStmt = DB::get()->prepare($updateSql);
        $updateStmt->execute($updateParams);

        if ($updateStmt->rowCount() > 0) {
            return;
        }

        // rowCount() can be 0 when the row exists but values did not change.
        // Avoid trying INSERT in this case to prevent duplicate PK errors.
        if ($this->existsByIdForManager($id, (string) $managerId)) {
            return;
        }

        // Defensive guard: do not allow writing an equipment id that belongs to another manager.
        if ($this->existsById($id)) {
            throw new RuntimeException('Forbidden', 403);
        }

        $insertFields = [$this->idField() => $id] + $updates;
        $columns = array_keys($insertFields);
        $insertSql = sprintf(
            'INSERT INTO `%s` (%s) VALUES (%s)',
            $this->table(),
            implode(', ', array_map(static fn(string $c): string => '`' . $c . '`', $columns)),
            implode(', ', array_map(static fn(string $c): string => ':' . $c, $columns))
        );
        $insertStmt = DB::get()->prepare($insertSql);
        $insertStmt->execute($insertFields);
    }

    private function existsByIdForManager(string $id, string $managerId): bool
    {
        $sql = sprintf(
            'SELECT 1 FROM `%s` WHERE `%s` = :id AND `%s` = :managerId LIMIT 1',
            $this->table(),
            $this->idField(),
            $this->managerField()
        );
        $stmt = DB::get()->prepare($sql);
        $stmt->execute([
            'id' => $id,
            'managerId' => $managerId,
        ]);
        $row = $stmt->fetch();
        return is_array($row);
    }

    private function existsById(string $id): bool
    {
        $sql = sprintf(
            'SELECT 1 FROM `%s` WHERE `%s` = :id LIMIT 1',
            $this->table(),
            $this->idField()
        );
        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return is_array($row);
    }

    /** @param array<string,mixed> $row */
    private function mapRow(array $row, string|int $managerId): array
    {
        $activeRaw = $this->activeField() !== null ? ($row[$this->activeField()] ?? 1) : 1;

        return [
            'id' => (string) ($row[$this->idField()] ?? ''),
            'code' => (string) ($row[$this->codeField()] ?? ''),
            'description' => $this->descriptionField() !== null ? (string) ($row[$this->descriptionField()] ?? '') : '',
            'active' => ((string) $activeRaw === '1' || (int) $activeRaw === 1 || $activeRaw === true),
            'type' => $this->typeField() !== null ? (string) ($row[$this->typeField()] ?? 'PRIMARY') : 'PRIMARY',
            'category' => $this->categoryField() !== null ? (string) ($row[$this->categoryField()] ?? '') : '',
            'managerId' => (string) ($row[$this->managerField()] ?? (string) $managerId),
        ];
    }

    private function table(): string
    {
        return $this->env('EQUIPMENTS_TABLE', 'equipments');
    }

    private function idField(): string
    {
        return $this->resolveField([$this->env('EQUIPMENTS_ID_FIELD', 'id'), 'id']) ?? 'id';
    }

    private function managerField(): string
    {
        return $this->resolveField([$this->env('EQUIPMENTS_MANAGER_FIELD', 'managerId'), 'managerId', 'manager_id']) ?? 'manager_id';
    }

    private function codeField(): string
    {
        return $this->resolveField([$this->env('EQUIPMENTS_CODE_FIELD', 'code'), 'code']) ?? 'code';
    }

    private function descriptionField(): ?string
    {
        return $this->resolveField([$this->env('EQUIPMENTS_DESCRIPTION_FIELD', 'description'), 'description']);
    }

    private function activeField(): ?string
    {
        return $this->resolveField([$this->env('EQUIPMENTS_ACTIVE_FIELD', 'active'), 'active']);
    }

    private function typeField(): ?string
    {
        return $this->resolveField([$this->env('EQUIPMENTS_TYPE_FIELD', 'type'), 'type']);
    }

    private function categoryField(): ?string
    {
        return $this->resolveField([$this->env('EQUIPMENTS_CATEGORY_FIELD', 'category'), 'category']);
    }

    private function resolveField(array $candidates): ?string
    {
        $columns = $this->columns();
        foreach ($candidates as $field) {
            $clean = str_replace('`', '', (string) $field);
            if ($clean !== '' && isset($columns[$clean])) {
                return $clean;
            }
        }
        return null;
    }

    /** @return array<string, bool> */
    private function columns(): array
    {
        if (is_array($this->columns)) {
            return $this->columns;
        }

        if (!$this->tableExists()) {
            $this->columns = [];
            return $this->columns;
        }

        $sql = sprintf('SHOW COLUMNS FROM `%s`', $this->table());
        $rows = DB::get()->query($sql)->fetchAll();
        $result = [];
        foreach ($rows as $row) {
            if (is_array($row) && isset($row['Field'])) {
                $result[(string) $row['Field']] = true;
            }
        }
        $this->columns = $result;
        return $result;
    }

    private function tableExists(): bool
    {
        if (is_bool($this->tableExistsCache)) {
            return $this->tableExistsCache;
        }

        try {
            $stmt = DB::get()->prepare('SHOW TABLES LIKE :table');
            $stmt->execute(['table' => $this->table()]);
            $row = $stmt->fetch();
            $this->tableExistsCache = is_array($row);
            return $this->tableExistsCache;
        } catch (Throwable) {
            $this->tableExistsCache = false;
            return false;
        }
    }

    private function env(string $key, string $default): string
    {
        $value = getenv($key);
        if ($value === false) {
            return $default;
        }
        $trimmed = trim((string) $value);
        return $trimmed === '' ? $default : $trimmed;
    }
}
