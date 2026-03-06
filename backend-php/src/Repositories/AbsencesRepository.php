<?php
declare(strict_types=1);

require_once __DIR__ . '/../DB.php';

final class AbsencesRepository
{
    /** @var array<string, bool>|null */
    private ?array $columns = null;

    public function create(string|int $managerId, array $payload): array
    {
        $idField = $this->idField();
        $managerField = $this->managerField();
        $userField = $this->userField();
        $dateField = $this->dateField();
        $reasonField = $this->reasonField();
        $createdField = $this->createdField();
        $startField = $this->startDateField();
        $endField = $this->endDateField();
        $typeField = $this->typeField();

        $id = $payload['id'] ?? $this->generateId();
        if (!is_string($id) && !is_int($id)) {
            throw new InvalidArgumentException('Invalid payload');
        }

        $dateInput = $payload['date'] ?? null;
        if ($dateField !== null) {
            $dateValue = $payload[$dateField] ?? $dateInput;
            if (!is_string($dateValue) || trim($dateValue) === '') {
                throw new InvalidArgumentException('Invalid payload');
            }
        }

        $fields = [
            $idField => (string) $id,
            $managerField => (string) $managerId,
        ];

        if ($userField !== null) {
            $userValue = $payload['userId'] ?? $payload['user_id'] ?? $payload['entityId'] ?? $payload['entity_id'] ?? null;
            if ($userValue !== null && $userValue !== '') {
                $fields[$userField] = (string) $userValue;
            }
        }

        if ($dateField !== null) {
            $fields[$dateField] = (string) ($payload[$dateField] ?? $dateInput);
        }

        if ($startField !== null) {
            $start = $payload['startDate'] ?? $payload['start_date'] ?? $dateInput ?? null;
            if (is_string($start) && trim($start) !== '') {
                $fields[$startField] = $start;
            }
        }

        if ($endField !== null) {
            $end = $payload['endDate'] ?? $payload['end_date'] ?? $dateInput ?? null;
            if (is_string($end) && trim($end) !== '') {
                $fields[$endField] = $end;
            }
        }

        if ($reasonField !== null) {
            $reason = $payload[$reasonField] ?? $payload['reason'] ?? null;
            if (is_string($reason) && trim($reason) !== '') {
                $fields[$reasonField] = $reason;
            }
        }

        if ($typeField !== null) {
            $type = $payload[$typeField] ?? $payload['type'] ?? null;
            if (is_string($type) && trim($type) !== '') {
                $fields[$typeField] = $type;
            }
        }

        if ($createdField !== null) {
            $fields[$createdField] = date('Y-m-d H:i:s');
        }

        $columns = array_keys($fields);
        $sql = sprintf(
            'INSERT INTO `%s` (%s) VALUES (%s)',
            $this->table(),
            implode(', ', array_map(static fn(string $c): string => '`' . $c . '`', $columns)),
            implode(', ', array_map(static fn(string $c): string => ':' . $c, $columns))
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute($fields);

        $created = $this->findById((string) $id);
        if ($created === null) {
            throw new RuntimeException('Not found');
        }
        return $created;
    }

    /** @return array<int, array<string,mixed>> */
    public function listByManagerId(string|int $managerId): array
    {
        $sql = sprintf(
            'SELECT * FROM `%s` WHERE `%s` = :managerId ORDER BY `%s` DESC',
            $this->table(),
            $this->managerField(),
            $this->createdField() ?? $this->idField()
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['managerId' => (string) $managerId]);
        $rows = $stmt->fetchAll();

        $result = [];
        foreach ($rows as $row) {
            if (is_array($row)) {
                $result[] = $this->mapRow($row);
            }
        }
        return $result;
    }

    public function findById(string|int $id): ?array
    {
        $sql = sprintf(
            'SELECT * FROM `%s` WHERE `%s` = :id LIMIT 1',
            $this->table(),
            $this->idField()
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['id' => (string) $id]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return null;
        }

        return $this->mapRow($row);
    }

    public function delete(string|int $managerId, string|int $id): bool
    {
        $sql = sprintf(
            'DELETE FROM `%s` WHERE `%s` = :id AND `%s` = :managerId',
            $this->table(),
            $this->idField(),
            $this->managerField()
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute([
            'id' => (string) $id,
            'managerId' => (string) $managerId,
        ]);

        return $stmt->rowCount() > 0;
    }

    private function mapRow(array $row): array
    {
        $id = (string) ($row[$this->idField()] ?? '');
        $managerRaw = $row[$this->managerField()] ?? null;
        $managerId = $managerRaw !== null ? (string) $managerRaw : '';

        $userField = $this->userField();
        $entityIdRaw = null;
        if ($userField !== null && array_key_exists($userField, $row)) {
            $entityIdRaw = $row[$userField];
        } elseif (array_key_exists('entity_id', $row)) {
            $entityIdRaw = $row['entity_id'];
        } elseif (array_key_exists('user_id', $row)) {
            $entityIdRaw = $row['user_id'];
        }
        $entityId = $entityIdRaw !== null ? (string) $entityIdRaw : '';

        $dateField = $this->dateField();
        $dateValue = null;
        if ($dateField !== null && array_key_exists($dateField, $row)) {
            $dateValue = $row[$dateField];
        }

        $startField = $this->startDateField();
        $startValue = null;
        if ($startField !== null && array_key_exists($startField, $row)) {
            $startValue = $row[$startField];
        }
        if ((!is_string($startValue) || trim($startValue) === '') && is_string($dateValue)) {
            $startValue = $dateValue;
        }

        $endField = $this->endDateField();
        $endValue = null;
        if ($endField !== null && array_key_exists($endField, $row)) {
            $endValue = $row[$endField];
        }
        if ((!is_string($endValue) || trim($endValue) === '') && is_string($dateValue)) {
            $endValue = $dateValue;
        }

        $reasonField = $this->reasonField();
        $reasonValue = null;
        if ($reasonField !== null && array_key_exists($reasonField, $row)) {
            $reasonValue = $row[$reasonField];
        }

        $typeField = $this->typeField();
        $typeValue = null;
        if ($typeField !== null && array_key_exists($typeField, $row)) {
            $typeValue = $row[$typeField];
        }
        if (!is_string($typeValue) || trim($typeValue) === '') {
            $typeValue = 'USER';
        }

        $createdField = $this->createdField();
        $createdValue = null;
        if ($createdField !== null && array_key_exists($createdField, $row)) {
            $createdValue = $row[$createdField];
        }

        $item = [
            'id' => $id,
            'entityId' => $entityId,
            'type' => (string) $typeValue,
            'reason' => is_string($reasonValue) ? $reasonValue : '',
            'startDate' => is_string($startValue) ? $startValue : '',
            'endDate' => is_string($endValue) ? $endValue : '',
            'managerId' => $managerId,
        ];

        if (is_string($dateValue) && trim($dateValue) !== '') {
            $item['date'] = $dateValue;
        }

        if ($createdValue !== null) {
            $item['createdAt'] = $createdValue;
        }

        return $item;
    }

    private function generateId(): string
    {
        return 'abs_' . bin2hex(random_bytes(8));
    }

    private function table(): string
    {
        return $this->env('ABSENCES_TABLE', 'absences');
    }

    private function idField(): string
    {
        return $this->resolveField([$this->env('ABSENCES_ID_FIELD', 'id'), 'id']) ?? 'id';
    }

    private function managerField(): string
    {
        return $this->resolveField([$this->env('ABSENCES_MANAGER_FIELD', 'managerId'), 'managerId', 'manager_id']) ?? 'manager_id';
    }

    private function userField(): ?string
    {
        return $this->resolveField([$this->env('ABSENCES_USER_FIELD', 'userId'), 'userId', 'user_id', 'entity_id']);
    }

    private function dateField(): ?string
    {
        return $this->resolveField([$this->env('ABSENCES_DATE_FIELD', 'date'), 'date']);
    }

    private function startDateField(): ?string
    {
        return $this->resolveField(['startDate', 'start_date']);
    }

    private function endDateField(): ?string
    {
        return $this->resolveField(['endDate', 'end_date']);
    }

    private function reasonField(): ?string
    {
        return $this->resolveField([$this->env('ABSENCES_REASON_FIELD', 'reason'), 'reason']);
    }

    private function createdField(): ?string
    {
        return $this->resolveField([$this->env('ABSENCES_CREATED_FIELD', 'createdAt'), 'createdAt', 'created_at']);
    }

    private function typeField(): ?string
    {
        return $this->resolveField(['type']);
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
