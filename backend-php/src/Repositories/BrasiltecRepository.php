<?php
declare(strict_types=1);

require_once __DIR__ . '/../DB.php';

final class BrasiltecRepository
{
    /** @var array<string, bool>|null */
    private ?array $columns = null;
    private ?string $resolvedTable = null;

    public function listByManagerId(string|int $managerId): array
    {
        $sql = sprintf(
            'SELECT * FROM `%s` WHERE `%s` = :managerId ORDER BY `%s` DESC',
            $this->table(),
            $this->managerField(),
            $this->orderField()
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

    public function listAll(): array
    {
        $sql = sprintf(
            'SELECT * FROM `%s` ORDER BY `%s` DESC',
            $this->table(),
            $this->orderField()
        );

        $rows = DB::get()->query($sql)->fetchAll();
        $result = [];
        foreach ($rows as $row) {
            if (is_array($row)) {
                $result[] = $this->mapRow($row);
            }
        }
        return $result;
    }

    public function create(string|int $managerId, array $payload): array
    {
        $name = trim((string) ($payload['name'] ?? ''));
        $phone = trim((string) ($payload['phone'] ?? ''));
        $code = trim((string) ($payload['code'] ?? ''));

        if ($name === '' && $phone === '' && $code === '') {
            throw new InvalidArgumentException('At least one identifier is required');
        }

        $id = $payload['id'] ?? ('br_' . bin2hex(random_bytes(8)));
        if (!is_string($id) && !is_int($id)) {
            throw new InvalidArgumentException('Invalid id');
        }

        $fields = [
            $this->idField() => (string) $id,
            $this->managerField() => (string) $managerId,
        ];

        $nameField = $this->nameField();
        if ($nameField !== null && $name !== '') {
            $fields[$nameField] = $name;
        }

        $phoneField = $this->phoneField();
        if ($phoneField !== null && $phone !== '') {
            $fields[$phoneField] = $phone;
        }

        $codeField = $this->codeField();
        if ($codeField !== null && $code !== '') {
            $fields[$codeField] = $code;
        }

        $createdField = $this->createdField();
        if ($createdField !== null) {
            $fields[$createdField] = date('Y-m-d H:i:s');
        }

        // Compatibilidade com schema legado que exige password NOT NULL
        $passwordField = $this->passwordField();
        if ($passwordField !== null) {
            $password = trim((string) ($payload['password'] ?? ''));
            if ($password === '') {
                $password = $code !== '' ? $code : ($name !== '' ? $name : 'BRASILTEC');
            }
            $fields[$passwordField] = $password;
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

    public function validateCredentials(string|int $managerId, string|int $id, string $password): bool
    {
        $passwordField = $this->passwordField();
        if ($passwordField === null) {
            return false;
        }

        $sql = sprintf(
            'SELECT `%s` FROM `%s` WHERE `%s` = :id AND `%s` = :managerId LIMIT 1',
            $passwordField,
            $this->table(),
            $this->idField(),
            $this->managerField()
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute([
            'id' => (string) $id,
            'managerId' => (string) $managerId,
        ]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return false;
        }

        $stored = (string) ($row[$passwordField] ?? '');
        if ($stored === '') {
            return false;
        }

        $info = password_get_info($stored);
        $isHash = isset($info['algo']) && $info['algo'] !== null && $info['algo'] !== 0;
        if ($isHash) {
            return password_verify($password, $stored);
        }
        return hash_equals($stored, $password);
    }

    public function validateCredentialsGlobal(string|int $id, string $password): bool
    {
        $passwordField = $this->passwordField();
        if ($passwordField === null) {
            return false;
        }

        $sql = sprintf(
            'SELECT `%s` FROM `%s` WHERE `%s` = :id LIMIT 1',
            $passwordField,
            $this->table(),
            $this->idField()
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute([
            'id' => (string) $id,
        ]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return false;
        }

        $stored = (string) ($row[$passwordField] ?? '');
        if ($stored === '') {
            return false;
        }

        $info = password_get_info($stored);
        $isHash = isset($info['algo']) && $info['algo'] !== null && $info['algo'] !== 0;
        if ($isHash) {
            return password_verify($password, $stored);
        }
        return hash_equals($stored, $password);
    }

    private function mapRow(array $row): array
    {
        $item = [
            'id' => $row[$this->idField()] ?? null,
            'managerId' => is_numeric((string) ($row[$this->managerField()] ?? null))
                ? (int) $row[$this->managerField()]
                : ($row[$this->managerField()] ?? null),
        ];

        $nameField = $this->nameField();
        if ($nameField !== null && array_key_exists($nameField, $row)) {
            $item['name'] = $row[$nameField];
        }

        $phoneField = $this->phoneField();
        if ($phoneField !== null && array_key_exists($phoneField, $row)) {
            $item['phone'] = $row[$phoneField];
        }

        $codeField = $this->codeField();
        if ($codeField !== null && array_key_exists($codeField, $row)) {
            $item['code'] = $row[$codeField];
        }

        $createdField = $this->createdField();
        if ($createdField !== null && array_key_exists($createdField, $row)) {
            $item['createdAt'] = $row[$createdField];
        }

        return $item;
    }

    private function table(): string
    {
        if (is_string($this->resolvedTable)) {
            return $this->resolvedTable;
        }

        $preferred = $this->env('BRASILTEC_TABLE', 'brasiltec_users');
        $candidates = [$preferred, 'brasiltec_users', 'brasiltec'];
        foreach ($candidates as $candidate) {
            $name = str_replace('`', '', (string) $candidate);
            if ($name !== '' && $this->tableExists($name)) {
                $this->resolvedTable = $name;
                return $name;
            }
        }

        $this->resolvedTable = str_replace('`', '', $preferred);
        return $this->resolvedTable;
    }

    private function idField(): string
    {
        return $this->resolveField([$this->env('BRASILTEC_ID_FIELD', 'id'), 'id']) ?? 'id';
    }

    private function managerField(): string
    {
        return $this->resolveField([$this->env('BRASILTEC_MANAGER_FIELD', 'managerId'), 'managerId', 'manager_id']) ?? 'manager_id';
    }

    private function nameField(): ?string
    {
        return $this->resolveField([$this->env('BRASILTEC_NAME_FIELD', 'name'), 'name']);
    }

    private function phoneField(): ?string
    {
        return $this->resolveField([$this->env('BRASILTEC_PHONE_FIELD', 'phone'), 'phone', 'targetPhone']);
    }

    private function codeField(): ?string
    {
        return $this->resolveField([$this->env('BRASILTEC_CODE_FIELD', 'code'), 'code']);
    }

    private function createdField(): ?string
    {
        return $this->resolveField([$this->env('BRASILTEC_CREATED_FIELD', 'createdAt'), 'createdAt', 'created_at']);
    }

    private function passwordField(): ?string
    {
        return $this->resolveField(['password']);
    }

    private function orderField(): string
    {
        return $this->createdField() ?? $this->idField();
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

    private function tableExists(string $table): bool
    {
        $stmt = DB::get()->prepare('SHOW TABLES LIKE :table');
        $stmt->execute(['table' => $table]);
        $row = $stmt->fetch();
        return is_array($row);
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
