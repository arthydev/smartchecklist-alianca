<?php
declare(strict_types=1);

require_once __DIR__ . '/../DB.php';

final class SettingsRepository
{
    /** @var array<string, bool>|null */
    private ?array $columns = null;

    public function findByManagerId(string|int $managerId): ?array
    {
        $table = $this->table();
        $managerField = $this->managerField();
        $idField = $this->idField();

        $sql = sprintf(
            'SELECT * FROM `%s` WHERE `%s` = :managerId LIMIT 1',
            $table,
            $managerField
        );

        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['managerId' => $managerId]);
        $row = $stmt->fetch();

        if (!is_array($row)) {
            return null;
        }

        $decoded = $this->buildPayloadFromRow($row);
        $normalizedManagerId = isset($row[$managerField]) && $row[$managerField] !== null && $row[$managerField] !== ''
            ? (string) $row[$managerField]
            : (string) $managerId;

        return [
            'id' => $idField !== null ? ($row[$idField] ?? null) : null,
            'managerId' => $normalizedManagerId,
            'payload' => $decoded,
        ];
    }

    public function upsert(string|int $managerId, array $payload): array
    {
        $this->ensureRowExists($managerId);

        if ($this->usesSplitSettingsColumns()) {
            $updates = [];

            $itemsField = $this->itemsField();
            if ($itemsField !== null) {
                $updates[$itemsField] = $this->encodeJson($payload['items'] ?? []);
            }

            $substituteField = $this->substituteField();
            if ($substituteField !== null) {
                $updates[$substituteField] = $this->encodeJson($payload['substitute'] ?? ['name' => '', 'phone' => '', 'isActive' => false]);
            }

            $scrapRecipientsField = $this->scrapRecipientsField();
            if ($scrapRecipientsField !== null) {
                $updates[$scrapRecipientsField] = $this->encodeJson($payload['scrapRecipients'] ?? []);
            }

            $scrapClientsField = $this->scrapClientsField();
            if ($scrapClientsField !== null) {
                $updates[$scrapClientsField] = $this->encodeJson($payload['scrapClients'] ?? []);
            }

            if (count($updates) > 0) {
                $sets = [];
                foreach (array_keys($updates) as $field) {
                    $sets[] = sprintf('`%s` = :%s', $field, $field);
                }
                $sql = sprintf(
                    'UPDATE `%s` SET %s WHERE `%s` = :managerId',
                    $this->table(),
                    implode(', ', $sets),
                    $this->managerField()
                );
                $updates['managerId'] = (string) $managerId;
                $stmt = DB::get()->prepare($sql);
                $stmt->execute($updates);
            }
        } else {
            $jsonField = $this->jsonField();
            $jsonValue = $this->encodeJson($payload);
            $sql = sprintf(
                'UPDATE `%s` SET `%s` = :jsonValue WHERE `%s` = :managerId',
                $this->table(),
                $jsonField,
                $this->managerField()
            );
            $stmt = DB::get()->prepare($sql);
            $stmt->execute([
                'jsonValue' => $jsonValue,
                'managerId' => (string) $managerId,
            ]);
        }

        $saved = $this->findByManagerId($managerId);
        return is_array($saved) ? (array) ($saved['payload'] ?? []) : [];
    }

    private function buildPayloadFromRow(array $row): array
    {
        if ($this->usesSplitSettingsColumns()) {
            $payload = [];

            $itemsField = $this->itemsField();
            if ($itemsField !== null) {
                $payload['items'] = $this->decodePayload($row[$itemsField] ?? null);
            }

            $substituteField = $this->substituteField();
            if ($substituteField !== null) {
                $decodedSubstitute = $this->decodePayload($row[$substituteField] ?? null);
                $payload['substitute'] = is_array($decodedSubstitute) ? $decodedSubstitute : [];
            }

            $recipientsField = $this->scrapRecipientsField();
            if ($recipientsField !== null) {
                $payload['scrapRecipients'] = $this->decodePayload($row[$recipientsField] ?? null);
            }

            $clientsField = $this->scrapClientsField();
            if ($clientsField !== null) {
                $payload['scrapClients'] = $this->decodePayload($row[$clientsField] ?? null);
            }

            return $payload;
        }

        $jsonField = $this->jsonField();
        return $this->decodePayload($row[$jsonField] ?? null);
    }

    private function decodePayload(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (!is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function encodeJson(mixed $value): string
    {
        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE);
        return $encoded === false ? '{}' : $encoded;
    }

    private function table(): string
    {
        $table = $this->env('SETTINGS_TABLE', 'settings');
        return str_replace('`', '', $table);
    }

    private function idField(): ?string
    {
        $preferred = $this->env('SETTINGS_ID_FIELD', 'id');
        return $this->resolveOptionalField([$preferred, 'id']);
    }

    private function managerField(): string
    {
        $preferred = $this->env('SETTINGS_MANAGER_FIELD', 'managerId');
        $resolved = $this->resolveOptionalField([$preferred, 'managerId', 'manager_id']);
        return $resolved ?? $preferred;
    }

    private function jsonField(): string
    {
        $preferred = $this->env('SETTINGS_JSON_FIELD', 'data');
        $resolved = $this->resolveOptionalField([$preferred, 'data', 'settings', 'json', 'settings_json', 'items']);
        return $resolved ?? $preferred;
    }

    private function usesSplitSettingsColumns(): bool
    {
        return $this->itemsField() !== null
            || $this->substituteField() !== null
            || $this->scrapRecipientsField() !== null
            || $this->scrapClientsField() !== null;
    }

    private function itemsField(): ?string
    {
        return $this->resolveOptionalField(['items']);
    }

    private function substituteField(): ?string
    {
        return $this->resolveOptionalField(['substitute']);
    }

    private function scrapRecipientsField(): ?string
    {
        return $this->resolveOptionalField(['scrap_recipients', 'scrapRecipients']);
    }

    private function scrapClientsField(): ?string
    {
        return $this->resolveOptionalField(['scrap_clients', 'scrapClients']);
    }

    private function ensureRowExists(string|int $managerId): void
    {
        $sql = sprintf(
            'SELECT 1 FROM `%s` WHERE `%s` = :managerId LIMIT 1',
            $this->table(),
            $this->managerField()
        );
        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['managerId' => (string) $managerId]);
        $exists = $stmt->fetch();
        if (is_array($exists)) {
            return;
        }

        $insert = sprintf(
            'INSERT INTO `%s` (`%s`) VALUES (:managerId)',
            $this->table(),
            $this->managerField()
        );
        $insertStmt = DB::get()->prepare($insert);
        $insertStmt->execute(['managerId' => (string) $managerId]);
    }

    private function resolveOptionalField(array $candidates): ?string
    {
        $columns = $this->columns();
        foreach ($candidates as $field) {
            $clean = str_replace('`', '', $field);
            if (isset($columns[$clean])) {
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
