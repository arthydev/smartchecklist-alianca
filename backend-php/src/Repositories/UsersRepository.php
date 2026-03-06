<?php
declare(strict_types=1);

require_once __DIR__ . '/../DB.php';

final class UsersRepository
{
    /** @var array<string, bool>|null */
    private ?array $columns = null;

    public function listByManagerId(string|int $managerId): array
    {
        $sql = sprintf(
            'SELECT * FROM `%s` WHERE `%s` = :managerId OR `%s` = :managerAsId',
            $this->table(),
            $this->managerField(),
            $this->idField()
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute([
            'managerId' => (string) $managerId,
            'managerAsId' => (string) $managerId,
        ]);

        $rows = $stmt->fetchAll();
        $result = [];
        foreach ($rows as $row) {
            if (is_array($row)) {
                $result[] = $this->mapUser($row);
            }
        }
        return $result;
    }

    public function findById(string|int $id): ?array
    {
        $row = $this->findRowById($id);
        return is_array($row) ? $this->mapUser($row) : null;
    }

    public function create(array $data): array
    {
        $username = trim((string) ($data['username'] ?? ''));
        $role = trim((string) ($data['role'] ?? ''));
        $managerId = $data['managerId'] ?? null;
        $passwordRaw = $data['password'] ?? null;

        if ($username === '' || $role === '' || (string) $managerId === '' || !is_string($passwordRaw) || $passwordRaw === '') {
            throw new InvalidArgumentException('Invalid payload');
        }

        $id = trim((string) ($data['id'] ?? ''));
        if ($id === '') {
            $id = (string) random_int(100000, 999999999);
        }
        $passwordToSave = $this->preparePassword($passwordRaw);

        $fields = [
            $this->idField() => $id,
            $this->usernameField() => $username,
            $this->passwordField() => $passwordToSave,
            $this->roleField() => $role,
            $this->managerField() => (string) $managerId,
        ];

        $nameField = $this->nameField();
        if ($nameField !== null) {
            $fields[$nameField] = (string) ($data['name'] ?? $username);
        }

        $emailField = $this->emailField();
        if ($emailField !== null && array_key_exists('email', $data)) {
            $fields[$emailField] = (string) $data['email'];
        }

        $areaField = $this->areaField();
        if ($areaField !== null && array_key_exists('area', $data)) {
            $fields[$areaField] = (string) $data['area'];
        }

        $phoneField = $this->phoneField();
        if ($phoneField !== null && array_key_exists('phone', $data)) {
            $fields[$phoneField] = (string) $data['phone'];
        }

        $createdField = $this->optionalField(['created_at', 'createdAt']);
        if ($createdField !== null) {
            $fields[$createdField] = date('Y-m-d H:i:s');
        }

        $columns = array_keys($fields);
        $placeholders = array_map(static fn(string $c): string => ':' . $c, $columns);
        $sql = sprintf(
            'INSERT INTO `%s` (%s) VALUES (%s)',
            $this->table(),
            implode(', ', array_map(static fn(string $c): string => '`' . $c . '`', $columns)),
            implode(', ', $placeholders)
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute($fields);

        $saved = $this->findById($id);
        if ($saved === null) {
            throw new RuntimeException('Failed to create user');
        }
        return $saved;
    }

    public function update(string|int $id, array $data): array
    {
        $existing = $this->findRowById($id);
        if (!is_array($existing)) {
            throw new RuntimeException('Not found');
        }

        $updates = [];
        if (array_key_exists('username', $data)) {
            $username = trim((string) $data['username']);
            if ($username === '') {
                throw new InvalidArgumentException('Invalid payload');
            }
            $updates[$this->usernameField()] = $username;
        }

        if (array_key_exists('role', $data)) {
            $role = trim((string) $data['role']);
            if ($role === '') {
                throw new InvalidArgumentException('Invalid payload');
            }
            $updates[$this->roleField()] = $role;
        }

        if (array_key_exists('password', $data) && is_string($data['password']) && $data['password'] !== '') {
            $updates[$this->passwordField()] = $this->preparePassword((string) $data['password']);
        }

        if (array_key_exists('managerId', $data) && (string) $data['managerId'] !== '') {
            $updates[$this->managerField()] = (string) $data['managerId'];
        }

        if (array_key_exists('name', $data) && $this->nameField() !== null) {
            $updates[$this->nameField()] = (string) $data['name'];
        }

        if (array_key_exists('email', $data) && $this->emailField() !== null) {
            $updates[$this->emailField()] = (string) $data['email'];
        }

        if (array_key_exists('area', $data) && $this->areaField() !== null) {
            $updates[$this->areaField()] = (string) $data['area'];
        }

        if (array_key_exists('phone', $data) && $this->phoneField() !== null) {
            $updates[$this->phoneField()] = (string) $data['phone'];
        }

        if (count($updates) > 0) {
            $set = [];
            foreach (array_keys($updates) as $field) {
                $set[] = sprintf('`%s` = :%s', $field, $field);
            }
            $updates['id'] = (string) $id;

            $sql = sprintf(
                'UPDATE `%s` SET %s WHERE `%s` = :id',
                $this->table(),
                implode(', ', $set),
                $this->idField()
            );

            $stmt = DB::get()->prepare($sql);
            $stmt->execute($updates);
        }

        $saved = $this->findById($id);
        if ($saved === null) {
            throw new RuntimeException('Not found');
        }
        return $saved;
    }

    public function delete(string|int $id): void
    {
        $sql = sprintf(
            'DELETE FROM `%s` WHERE `%s` = :id',
            $this->table(),
            $this->idField()
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['id' => (string) $id]);
    }

    private function findRowById(string|int $id): ?array
    {
        $sql = sprintf(
            'SELECT * FROM `%s` WHERE `%s` = :id LIMIT 1',
            $this->table(),
            $this->idField()
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['id' => (string) $id]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    private function mapUser(array $row): array
    {
        $id = (string) ($row[$this->idField()] ?? '');

        $managerField = $this->managerField();
        $managerRaw = $row[$managerField] ?? ($row['manager_id'] ?? null);
        $managerId = $managerRaw !== null ? (string) $managerRaw : null;

        $role = (string) ($row[$this->roleField()] ?? '');
        if ($role === 'MANAGER' && $id !== '') {
            $managerId = $id;
        }

        $created = null;
        $createdField = $this->optionalField(['created_at', 'createdAt']);
        if ($createdField !== null) {
            $created = $row[$createdField] ?? null;
        }

        return [
            'id' => $id,
            'name' => (string) ($row[$this->nameField() ?? 'name'] ?? ''),
            'username' => (string) ($row[$this->usernameField()] ?? ''),
            'role' => $role,
            'managerId' => $managerId,
            'email' => $this->emailField() !== null ? (string) ($row[$this->emailField()] ?? '') : '',
            'area' => $this->areaField() !== null ? (string) ($row[$this->areaField()] ?? '') : '',
            'phone' => $this->phoneField() !== null ? (string) ($row[$this->phoneField()] ?? '') : '',
            'createdAt' => $created,
        ];
    }

    private function preparePassword(string $password): string
    {
        $trimmed = trim($password);
        $info = password_get_info($trimmed);
        $isHash = isset($info['algo']) && $info['algo'] !== null && $info['algo'] !== 0;
        if ($isHash) {
            return $trimmed;
        }
        return password_hash($trimmed, PASSWORD_DEFAULT);
    }

    private function table(): string
    {
        return $this->env('USERS_TABLE', 'users');
    }

    private function idField(): string
    {
        $field = $this->optionalField([$this->env('USERS_ID_FIELD', 'id'), 'id']);
        return $field ?? 'id';
    }

    private function usernameField(): string
    {
        $field = $this->optionalField([$this->env('USERS_USERNAME_FIELD', 'username'), 'username']);
        return $field ?? 'username';
    }

    private function passwordField(): string
    {
        $field = $this->optionalField([$this->env('USERS_PASSWORD_FIELD', 'password'), 'password']);
        return $field ?? 'password';
    }

    private function roleField(): string
    {
        $field = $this->optionalField([$this->env('USERS_ROLE_FIELD', 'role'), 'role']);
        return $field ?? 'role';
    }

    private function managerField(): string
    {
        $field = $this->optionalField([$this->env('USERS_MANAGER_FIELD', 'managerId'), 'managerId', 'manager_id']);
        return $field ?? 'manager_id';
    }

    private function nameField(): ?string
    {
        return $this->optionalField([$this->env('USERS_NAME_FIELD', 'name'), 'name']);
    }

    private function emailField(): ?string
    {
        return $this->optionalField([$this->env('USERS_EMAIL_FIELD', 'email'), 'email']);
    }

    private function areaField(): ?string
    {
        return $this->optionalField([$this->env('USERS_AREA_FIELD', 'area'), 'area']);
    }

    private function phoneField(): ?string
    {
        return $this->optionalField([$this->env('USERS_PHONE_FIELD', 'phone'), 'phone']);
    }

    private function optionalField(array $candidates): ?string
    {
        $cols = $this->columns();
        foreach ($candidates as $field) {
            $clean = str_replace('`', '', (string) $field);
            if (isset($cols[$clean])) {
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
