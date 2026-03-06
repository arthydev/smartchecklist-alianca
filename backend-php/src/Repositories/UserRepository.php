<?php
declare(strict_types=1);

require_once __DIR__ . '/../DB.php';

final class UserRepository
{
    public function findByUsername(string $username): ?array
    {
        $table = $this->env('AUTH_USERS_TABLE', 'users');
        $idField = $this->env('AUTH_ID_FIELD', 'id');
        $usernameField = $this->env('AUTH_USERNAME_FIELD', 'username');
        $passwordField = $this->env('AUTH_PASSWORD_FIELD', 'password');
        $roleField = $this->env('AUTH_ROLE_FIELD', 'role');
        $managerField = $this->env('AUTH_MANAGER_FIELD', 'managerId');
        $nameField = $this->env('AUTH_NAME_FIELD', 'name');
        $areaField = $this->env('AUTH_AREA_FIELD', 'area');

        $sql = sprintf(
            'SELECT * FROM `%s` WHERE `%s` = :username LIMIT 1',
            str_replace('`', '', $table),
            str_replace('`', '', $usernameField)
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['username' => $username]);
        $row = $stmt->fetch();

        if (!is_array($row)) {
            return null;
        }

        $managerId = $row[$managerField] ?? $row['manager_id'] ?? null;

        return [
            'id' => $row[$idField] ?? null,
            'username' => $row[$usernameField] ?? null,
            'password' => $row[$passwordField] ?? null,
            'role' => $row[$roleField] ?? null,
            'managerId' => $managerId,
            'name' => $row[$nameField] ?? $row['name'] ?? null,
            'area' => $row[$areaField] ?? $row['area'] ?? null,
        ];
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
