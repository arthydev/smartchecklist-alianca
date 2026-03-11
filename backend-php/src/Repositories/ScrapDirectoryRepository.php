<?php
declare(strict_types=1);

require_once __DIR__ . '/../DB.php';

final class ScrapDirectoryRepository
{
    /** @return array<int, array{id:string,client:string,recipients:array<int,string>,active:bool}> */
    public function listByManagerId(string $managerId): array
    {
        $sql = <<<SQL
SELECT
  c.`id`,
  c.`client_name`,
  c.`active`,
  r.`email`
FROM `scrap_clients` c
LEFT JOIN `scrap_client_recipients` r ON r.`scrap_client_id` = c.`id`
WHERE c.`manager_id` = :managerId
ORDER BY c.`client_name` ASC, r.`email` ASC
SQL;

        $stmt = DB::get()->prepare($sql);
        $stmt->execute(['managerId' => $managerId]);
        $rows = $stmt->fetchAll();

        $grouped = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $id = (string) ($row['id'] ?? '');
            if ($id === '') {
                continue;
            }

            if (!isset($grouped[$id])) {
                $grouped[$id] = [
                    'id' => $id,
                    'client' => strtoupper(trim((string) ($row['client_name'] ?? ''))),
                    'recipients' => [],
                    'active' => ((int) ($row['active'] ?? 1)) === 1,
                ];
            }

            $email = strtolower(trim((string) ($row['email'] ?? '')));
            if ($email !== '' && !in_array($email, $grouped[$id]['recipients'], true)) {
                $grouped[$id]['recipients'][] = $email;
            }
        }

        return array_values($grouped);
    }

    /**
     * @param array<int, mixed> $directory
     * @return array<int, array{id:string,client:string,recipients:array<int,string>,active:bool}>
     */
    public function replaceForManager(string $managerId, array $directory): array
    {
        $normalizedEntries = $this->normalizeEntries($directory);
        $pdo = DB::get();
        $pdo->beginTransaction();

        try {
            $currentIdsStmt = $pdo->prepare('SELECT `id` FROM `scrap_clients` WHERE `manager_id` = :managerId');
            $currentIdsStmt->execute(['managerId' => $managerId]);
            $currentIds = array_map(
                static fn(array $row): string => (string) ($row['id'] ?? ''),
                array_filter($currentIdsStmt->fetchAll(), 'is_array')
            );

            $keptIds = [];
            foreach ($normalizedEntries as $entry) {
                $keptIds[] = $entry['id'];
                $this->upsertClient($managerId, $entry);
                $this->replaceRecipients($entry['id'], $entry['recipients']);
            }

            $idsToDelete = array_values(array_filter(
                $currentIds,
                static fn(string $id): bool => $id !== '' && !in_array($id, $keptIds, true)
            ));

            if ($idsToDelete !== []) {
                $placeholders = implode(', ', array_fill(0, count($idsToDelete), '?'));
                $deleteStmt = $pdo->prepare("DELETE FROM `scrap_clients` WHERE `id` IN ({$placeholders}) AND `manager_id` = ?");
                $deleteStmt->execute([...$idsToDelete, $managerId]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        return $this->listByManagerId($managerId);
    }

    /** @param array<int, mixed> $directory */
    private function normalizeEntries(array $directory): array
    {
        $result = [];
        $seenClients = [];

        foreach ($directory as $index => $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $client = strtoupper(trim((string) ($entry['client'] ?? '')));
            if ($client === '') {
                continue;
            }

            if (isset($seenClients[$client])) {
                throw new RuntimeException('Duplicate scrap client');
            }
            $seenClients[$client] = true;

            $id = trim((string) ($entry['id'] ?? ''));
            if ($id === '') {
                $id = 'SCRAP-' . ($index + 1) . '-' . bin2hex(random_bytes(4));
            }

            $recipients = [];
            $seenRecipients = [];
            if (isset($entry['recipients']) && is_array($entry['recipients'])) {
                foreach ($entry['recipients'] as $recipient) {
                    $email = strtolower(trim((string) $recipient));
                    if ($email === '') {
                        continue;
                    }
                    if (isset($seenRecipients[$email])) {
                        continue;
                    }
                    $seenRecipients[$email] = true;
                    $recipients[] = $email;
                }
            }

            $result[] = [
                'id' => $id,
                'client' => $client,
                'recipients' => $recipients,
                'active' => !array_key_exists('active', $entry) || (bool) $entry['active'],
            ];
        }

        return $result;
    }

    /** @param array{id:string,client:string,recipients:array<int,string>,active:bool} $entry */
    private function upsertClient(string $managerId, array $entry): void
    {
        $update = DB::get()->prepare(
            'UPDATE `scrap_clients` SET `client_name` = :clientName, `active` = :active WHERE `id` = :id AND `manager_id` = :managerId'
        );
        $update->execute([
            'id' => $entry['id'],
            'managerId' => $managerId,
            'clientName' => $entry['client'],
            'active' => $entry['active'] ? 1 : 0,
        ]);

        if ($update->rowCount() > 0 || $this->existsForManager($entry['id'], $managerId)) {
            return;
        }

        if ($this->existsById($entry['id'])) {
            throw new RuntimeException('Forbidden', 403);
        }

        $insert = DB::get()->prepare(
            'INSERT INTO `scrap_clients` (`id`, `manager_id`, `client_name`, `active`) VALUES (:id, :managerId, :clientName, :active)'
        );
        $insert->execute([
            'id' => $entry['id'],
            'managerId' => $managerId,
            'clientName' => $entry['client'],
            'active' => $entry['active'] ? 1 : 0,
        ]);
    }

    /** @param array<int, string> $recipients */
    private function replaceRecipients(string $clientId, array $recipients): void
    {
        $deleteStmt = DB::get()->prepare('DELETE FROM `scrap_client_recipients` WHERE `scrap_client_id` = :clientId');
        $deleteStmt->execute(['clientId' => $clientId]);

        if ($recipients === []) {
            return;
        }

        $insertStmt = DB::get()->prepare(
            'INSERT INTO `scrap_client_recipients` (`id`, `scrap_client_id`, `email`) VALUES (:id, :clientId, :email)'
        );

        foreach ($recipients as $email) {
            $insertStmt->execute([
                'id' => 'SCRAP-RECIPIENT-' . bin2hex(random_bytes(8)),
                'clientId' => $clientId,
                'email' => $email,
            ]);
        }
    }

    private function existsForManager(string $id, string $managerId): bool
    {
        $stmt = DB::get()->prepare('SELECT 1 FROM `scrap_clients` WHERE `id` = :id AND `manager_id` = :managerId LIMIT 1');
        $stmt->execute([
            'id' => $id,
            'managerId' => $managerId,
        ]);
        return is_array($stmt->fetch());
    }

    private function existsById(string $id): bool
    {
        $stmt = DB::get()->prepare('SELECT 1 FROM `scrap_clients` WHERE `id` = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        return is_array($stmt->fetch());
    }
}
