<?php
declare(strict_types=1);

require_once __DIR__ . '/../DB.php';

final class ChecklistsRepository
{
    /** @var array<string, bool>|null */
    private ?array $columns = null;
    /** @var array<string, array<string, bool>> */
    private static array $columnsCache = [];

    public function listByManagerId(string|int $managerId): array
    {
        $table = $this->table();
        $managerField = $this->managerField();
        $idField = $this->idField();
        $dataField = $this->dataField();
        $createdField = $this->createdField();

        $orderByField = $createdField ?? $idField;
        $orderSql = sprintf(' ORDER BY `%s` DESC', $orderByField);

        $sql = sprintf(
            'SELECT * FROM `%s` WHERE `%s` = :managerId%s',
            $table,
            $managerField,
            $orderSql
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['managerId' => (string) $managerId]);
        $rows = $stmt->fetchAll();

        $result = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $result[] = $this->mapRow($row, $idField, $managerField, $dataField);
        }

        return $result;
    }

    public function findById(string|int $id): ?array
    {
        $table = $this->table();
        $idField = $this->idField();
        $managerField = $this->managerField();
        $dataField = $this->dataField();

        $sql = sprintf(
            'SELECT * FROM `%s` WHERE `%s` = :id LIMIT 1',
            $table,
            $idField
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['id' => (string) $id]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return null;
        }

        return $this->mapRow($row, $idField, $managerField, $dataField);
    }

    public function upsert(array $checklist, string|int $managerId): array
    {
        $id = $checklist['id'] ?? null;
        if ($id === null || (is_string($id) && trim($id) === '')) {
            throw new InvalidArgumentException('Checklist id is required');
        }
        if (!array_key_exists('data', $checklist) || !is_array($checklist['data'])) {
            throw new InvalidArgumentException('Checklist data is required');
        }

        if (array_key_exists('managerId', $checklist) && $checklist['managerId'] !== null && $checklist['managerId'] !== '') {
            if ((string) $checklist['managerId'] !== (string) $managerId) {
                throw new RuntimeException('Forbidden', 403);
            }
        }

        $checklist['managerId'] = $managerId;
        $incomingData = $checklist['data'];

        // Merge incoming JSON with existing data to avoid accidental field loss on partial updates.
        $existing = $this->findById((string) $id);
        $existsForManager = is_array($existing) && (string) ($existing['managerId'] ?? '') === (string) $managerId;
        if ($existsForManager) {
            $existingData = $existing['data'] ?? null;
            if (is_array($existingData)) {
                $incomingData = $this->deepMerge($existingData, $incomingData);
            }
        }

        $dataJson = json_encode($incomingData, JSON_UNESCAPED_UNICODE);
        if ($dataJson === false) {
            throw new InvalidArgumentException('Checklist data is required');
        }

        $table = $this->table();
        $idField = $this->idField();
        $managerField = $this->managerField();
        $dataField = $this->dataField();
        $updatedField = $this->updatedField();
        $createdField = $this->createdField();
        $dateField = $this->dateField();
        $equipmentNoField = $this->equipmentNoField();
        $shiftField = $this->shiftField();
        $approvalField = $this->approvalStatusField();

        $dateValue = $this->normalizeDateValue($incomingData['date'] ?? $checklist['date'] ?? null);
        $equipmentNoValue = (string) ($incomingData['equipmentNo'] ?? $checklist['equipmentNo'] ?? '');
        $shiftValue = (string) ($incomingData['shift'] ?? $checklist['shift'] ?? '');
        $approvalValue = (string) ($incomingData['approvalStatus'] ?? $checklist['approvalStatus'] ?? 'PENDING');

        $set = [
            sprintf('`%s` = :managerId', $managerField),
            sprintf('`%s` = :data', $dataField),
        ];
        if ($dateField !== null) {
            $set[] = sprintf('`%s` = :legacyDate', $dateField);
        }
        if ($equipmentNoField !== null) {
            $set[] = sprintf('`%s` = :legacyEquipmentNo', $equipmentNoField);
        }
        if ($shiftField !== null) {
            $set[] = sprintf('`%s` = :legacyShift', $shiftField);
        }
        if ($approvalField !== null) {
            $set[] = sprintf('`%s` = :legacyApprovalStatus', $approvalField);
        }
        if ($updatedField !== null) {
            $set[] = sprintf('`%s` = NOW()', $updatedField);
        }

        $updateSql = sprintf(
            'UPDATE `%s` SET %s WHERE `%s` = :id',
            $table,
            implode(', ', $set),
            $idField
        );

        if ($existsForManager) {
            $updateStmt = DB::get()->prepare($updateSql);
            $updateParams = [
                'id' => (string) $id,
                'managerId' => (string) $managerId,
                'data' => $dataJson,
            ];
            if ($dateField !== null) {
                $updateParams['legacyDate'] = $dateValue;
            }
            if ($equipmentNoField !== null) {
                $updateParams['legacyEquipmentNo'] = $equipmentNoValue;
            }
            if ($shiftField !== null) {
                $updateParams['legacyShift'] = $shiftValue;
            }
            if ($approvalField !== null) {
                $updateParams['legacyApprovalStatus'] = $approvalValue;
            }
            $updateStmt->execute($updateParams);
        } else {
            $insertColumns = [$idField, $managerField, $dataField];
            $insertValues = [':id', ':managerId', ':data'];
            if ($dateField !== null) {
                $insertColumns[] = $dateField;
                $insertValues[] = ':legacyDate';
            }
            if ($equipmentNoField !== null) {
                $insertColumns[] = $equipmentNoField;
                $insertValues[] = ':legacyEquipmentNo';
            }
            if ($shiftField !== null) {
                $insertColumns[] = $shiftField;
                $insertValues[] = ':legacyShift';
            }
            if ($approvalField !== null) {
                $insertColumns[] = $approvalField;
                $insertValues[] = ':legacyApprovalStatus';
            }
            if ($createdField !== null) {
                $insertColumns[] = $createdField;
                $insertValues[] = 'NOW()';
            }
            if ($updatedField !== null) {
                $insertColumns[] = $updatedField;
                $insertValues[] = 'NOW()';
            }

            $insertSql = sprintf(
                'INSERT INTO `%s` (%s) VALUES (%s)',
                $table,
                implode(', ', array_map(static fn(string $c): string => '`' . $c . '`', $insertColumns)),
                implode(', ', $insertValues)
            );

            $insertStmt = DB::get()->prepare($insertSql);
            $insertParams = [
                'id' => (string) $id,
                'managerId' => (string) $managerId,
                'data' => $dataJson,
            ];
            if ($dateField !== null) {
                $insertParams['legacyDate'] = $dateValue;
            }
            if ($equipmentNoField !== null) {
                $insertParams['legacyEquipmentNo'] = $equipmentNoValue;
            }
            if ($shiftField !== null) {
                $insertParams['legacyShift'] = $shiftValue;
            }
            if ($approvalField !== null) {
                $insertParams['legacyApprovalStatus'] = $approvalValue;
            }
            $insertStmt->execute($insertParams);
        }

        $saved = $this->findById((string) $id);
        if ($saved === null) {
            throw new RuntimeException('Not found');
        }
        return $saved;
    }

    private function mapRow(array $row, string $idField, string $managerField, string $dataField): array
    {
        $decodedData = null;
        $dataError = false;
        $rawData = $row[$dataField] ?? null;

        if (is_array($rawData)) {
            $decodedData = $rawData;
        } elseif (is_string($rawData)) {
            $decodedData = json_decode($rawData, true);
            if (!is_array($decodedData)) {
                $decodedData = null;
                $dataError = true;
            }
        } elseif ($rawData !== null) {
            $dataError = true;
        }

        $id = $row[$idField] ?? null;
        $managerId = ($row[$managerField] ?? null);

        $item = [
            'id' => $id,
            'managerId' => $managerId,
            'data' => $decodedData,
        ];

        $created = $this->createdField();
        if ($created !== null && array_key_exists($created, $row)) {
            $item['createdAt'] = $row[$created];
        }

        $updated = $this->updatedField();
        if ($updated !== null && array_key_exists($updated, $row)) {
            $item['updatedAt'] = $row[$updated];
        }

        $type = $this->typeField();
        if ($type !== null && array_key_exists($type, $row)) {
            $item['type'] = $row[$type];
        }

        $status = $this->statusField();
        if ($status !== null && array_key_exists($status, $row)) {
            $item['status'] = $row[$status];
        }

        if ($dataError) {
            $item['dataError'] = true;
        }

        return $this->toChecklistEntryShape($item, $decodedData);
    }

    /**
     * @param array<string,mixed> $base
     * @param array<string,mixed> $incoming
     * @return array<string,mixed>
     */
    private function deepMerge(array $base, array $incoming): array
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
                $merged[$key] = $this->deepMerge($merged[$key], $value);
                continue;
            }

            $merged[$key] = $value;
        }
        return $merged;
    }

    /**
     * Keep GET /api/checklists compatible with legacy ChecklistEntry shape used by frontend.
     *
     * @param array<string,mixed> $base
     * @param array<string,mixed>|null $decodedData
     * @return array<string,mixed>
     */
    private function toChecklistEntryShape(array $base, ?array $decodedData): array
    {
        $payload = is_array($decodedData) ? $decodedData : [];

        $merged = array_merge($payload, $base);
        $merged['id'] = $base['id'] ?? ($payload['id'] ?? null);
        $merged['managerId'] = $base['managerId'] ?? ($payload['managerId'] ?? null);

        // Core fields expected by frontend views.
        $merged['userId'] = (string) ($merged['userId'] ?? '');
        $merged['userName'] = (string) ($merged['userName'] ?? '');
        $merged['date'] = (string) ($merged['date'] ?? '');
        $merged['equipmentNo'] = (string) ($merged['equipmentNo'] ?? '');
        $merged['area'] = (string) ($merged['area'] ?? '');
        $merged['shift'] = (string) ($merged['shift'] ?? '');
        $merged['observations'] = (string) ($merged['observations'] ?? '');
        $merged['items'] = is_array($merged['items'] ?? null) ? $merged['items'] : [];
        $merged['evidence'] = is_array($merged['evidence'] ?? null) ? $merged['evidence'] : [];

        if (!isset($merged['approvalStatus']) || !is_string($merged['approvalStatus']) || $merged['approvalStatus'] === '') {
            $statusFallback = $merged['status'] ?? null;
            $merged['approvalStatus'] = is_string($statusFallback) && $statusFallback !== '' ? $statusFallback : 'PENDING';
        }

        // Keep createdAt stable for frontend sort/filter.
        $createdRaw = $merged['createdAt'] ?? null;
        if (is_numeric((string) $createdRaw)) {
            $merged['createdAt'] = (int) $createdRaw;
        } elseif (is_string($createdRaw) && trim($createdRaw) !== '') {
            $ts = strtotime($createdRaw);
            $merged['createdAt'] = $ts !== false ? $ts * 1000 : 0;
        } else {
            $merged['createdAt'] = 0;
        }

        return $merged;
    }

    private function table(): string
    {
        return $this->env('CHECKLISTS_TABLE', 'checklists');
    }

    private function idField(): string
    {
        return $this->resolveField([$this->env('CHECKLISTS_ID_FIELD', 'id'), 'id']) ?? 'id';
    }

    private function managerField(): string
    {
        return $this->resolveField([$this->env('CHECKLISTS_MANAGER_FIELD', 'managerId'), 'managerId', 'manager_id']) ?? 'manager_id';
    }

    private function dataField(): string
    {
        return $this->resolveField([$this->env('CHECKLISTS_DATA_FIELD', 'data'), 'data']) ?? 'data';
    }

    private function createdField(): ?string
    {
        return $this->resolveField([$this->env('CHECKLISTS_CREATED_FIELD', 'createdAt'), 'createdAt', 'created_at']);
    }

    private function updatedField(): ?string
    {
        return $this->resolveField([$this->env('CHECKLISTS_UPDATED_FIELD', 'updatedAt'), 'updatedAt', 'updated_at']);
    }

    private function dateField(): ?string
    {
        return $this->resolveField([$this->env('CHECKLISTS_DATE_FIELD', 'date'), 'date']);
    }

    private function equipmentNoField(): ?string
    {
        return $this->resolveField([$this->env('CHECKLISTS_EQUIPMENT_FIELD', 'equipmentNo'), 'equipmentNo', 'equipment_no']);
    }

    private function shiftField(): ?string
    {
        return $this->resolveField([$this->env('CHECKLISTS_SHIFT_FIELD', 'shift'), 'shift']);
    }

    private function approvalStatusField(): ?string
    {
        return $this->resolveField([$this->env('CHECKLISTS_APPROVAL_FIELD', 'approvalStatus'), 'approvalStatus', 'approval_status']);
    }

    private function normalizeDateValue(mixed $raw): string
    {
        if (is_string($raw) && trim($raw) !== '') {
            $ts = strtotime($raw);
            if ($ts !== false) {
                return date('Y-m-d', $ts);
            }
        }

        return date('Y-m-d');
    }

    private function typeField(): ?string
    {
        $envValue = trim((string) getenv('CHECKLISTS_TYPE_FIELD'));
        if ($envValue !== '') {
            return $this->resolveField([$envValue]);
        }
        return null;
    }

    private function statusField(): ?string
    {
        $envValue = trim((string) getenv('CHECKLISTS_STATUS_FIELD'));
        if ($envValue !== '') {
            return $this->resolveField([$envValue]);
        }
        return null;
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

        $table = $this->table();
        if (isset(self::$columnsCache[$table])) {
            $this->columns = self::$columnsCache[$table];
            return $this->columns;
        }

        $sql = sprintf('SHOW COLUMNS FROM `%s`', $table);
        $rows = DB::get()->query($sql)->fetchAll();
        $result = [];
        foreach ($rows as $row) {
            if (is_array($row) && isset($row['Field'])) {
                $result[(string) $row['Field']] = true;
            }
        }

        $this->columns = $result;
        self::$columnsCache[$table] = $result;
        return $result;
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
