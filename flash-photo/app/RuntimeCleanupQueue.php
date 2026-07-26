<?php

declare(strict_types=1);

namespace FlashPhoto;

use InvalidArgumentException;
use PDO;

final class RuntimeCleanupQueue
{
    private const PATTERNS = [
        'pending' => '/^(?:\.tmp-[a-f0-9]{48}|[a-f0-9]{48}\.(?:jpg|png|webp|gif)\.pending)$/D',
        'rate_limit' => '/^[a-f0-9]{64}\.json$/D',
        'session_pending' => '/^[a-f0-9]{64}$/D',
        'session' => '/^[a-f0-9]{64}$/D',
        'session_delete' => '/^[a-f0-9]{64}$/D',
        'log' => '/^app-[0-9]{4}-[0-9]{2}-[0-9]{2}\.log$/D',
    ];
    private const TRANSITIONS = [
        'session_pending' => ['session', 'session_delete'],
        'session' => ['session_delete'],
    ];

    public function __construct(private readonly Database $database)
    {
    }

    public function schedule(string $category, string $itemName, int $dueAt): void
    {
        $this->validateItem($category, $itemName);
        if ($dueAt < 1) {
            throw new InvalidArgumentException('Cleanup due time must be positive.');
        }

        $statement = $this->database->pdo()->prepare(
            'INSERT INTO cleanup_queue (category, item_name, due_at, updated_at)
             VALUES (:category, :item_name, :due_at, :updated_at)
             ON CONFLICT (category, item_name) DO UPDATE SET
                due_at = excluded.due_at,
                updated_at = excluded.updated_at'
        );
        $statement->execute([
            'category' => $category,
            'item_name' => $itemName,
            'due_at' => $dueAt,
            'updated_at' => time(),
        ]);
    }

    public function scheduleNew(string $category, string $itemName, int $dueAt): bool
    {
        $this->validateItem($category, $itemName);
        if ($dueAt < 1) {
            throw new InvalidArgumentException('Cleanup due time must be positive.');
        }
        $statement = $this->database->pdo()->prepare(
            'INSERT OR IGNORE INTO cleanup_queue (category, item_name, due_at, updated_at)
             VALUES (:category, :item_name, :due_at, :updated_at)'
        );
        $statement->execute([
            'category' => $category,
            'item_name' => $itemName,
            'due_at' => $dueAt,
            'updated_at' => time(),
        ]);
        return $statement->rowCount() === 1;
    }

    public function remove(string $category, string $itemName): void
    {
        $this->validateItem($category, $itemName);
        $statement = $this->database->pdo()->prepare(
            'DELETE FROM cleanup_queue WHERE category = :category AND item_name = :item_name'
        );
        $statement->execute(['category' => $category, 'item_name' => $itemName]);
    }

    public function removeIfDue(string $category, string $itemName, int $expectedDueAt): bool
    {
        $this->validateItem($category, $itemName);
        if ($expectedDueAt < 1) {
            throw new InvalidArgumentException('Cleanup due time must be positive.');
        }
        $statement = $this->database->pdo()->prepare(
            'DELETE FROM cleanup_queue
             WHERE category = :category AND item_name = :item_name AND due_at = :expected_due_at'
        );
        $statement->bindValue('category', $category);
        $statement->bindValue('item_name', $itemName);
        $statement->bindValue('expected_due_at', $expectedDueAt, PDO::PARAM_INT);
        $statement->execute();
        return $statement->rowCount() === 1;
    }

    public function deferIfDue(
        string $category,
        string $itemName,
        int $expectedDueAt,
        int $newDueAt
    ): bool {
        $this->validateItem($category, $itemName);
        if ($expectedDueAt < 1 || $newDueAt <= $expectedDueAt) {
            throw new InvalidArgumentException('Deferred cleanup time must move forward.');
        }
        $statement = $this->database->pdo()->prepare(
            'UPDATE cleanup_queue SET due_at = :new_due_at, updated_at = :updated_at
             WHERE category = :category AND item_name = :item_name AND due_at = :expected_due_at'
        );
        $statement->bindValue('new_due_at', $newDueAt, PDO::PARAM_INT);
        $statement->bindValue('updated_at', time(), PDO::PARAM_INT);
        $statement->bindValue('category', $category);
        $statement->bindValue('item_name', $itemName);
        $statement->bindValue('expected_due_at', $expectedDueAt, PDO::PARAM_INT);
        $statement->execute();
        return $statement->rowCount() === 1;
    }

    public function transitionIfDue(
        string $fromCategory,
        string $toCategory,
        string $itemName,
        int $expectedDueAt,
        int $newDueAt
    ): bool {
        if (!in_array($toCategory, self::TRANSITIONS[$fromCategory] ?? [], true)) {
            throw new InvalidArgumentException('Invalid cleanup queue transition.');
        }
        $this->validateItem($fromCategory, $itemName);
        $this->validateItem($toCategory, $itemName);
        if ($expectedDueAt < 1 || $newDueAt < 1) {
            throw new InvalidArgumentException('Cleanup due time must be positive.');
        }
        $statement = $this->database->pdo()->prepare(
            'UPDATE cleanup_queue
             SET category = :to_category, due_at = :new_due_at, updated_at = :updated_at
             WHERE category = :from_category AND item_name = :item_name
             AND due_at = :expected_due_at
             AND NOT EXISTS (
                SELECT 1 FROM cleanup_queue AS target
                WHERE target.category = :to_category AND target.item_name = :item_name
             )'
        );
        $statement->bindValue('to_category', $toCategory);
        $statement->bindValue('new_due_at', $newDueAt, PDO::PARAM_INT);
        $statement->bindValue('updated_at', time(), PDO::PARAM_INT);
        $statement->bindValue('from_category', $fromCategory);
        $statement->bindValue('item_name', $itemName);
        $statement->bindValue('expected_due_at', $expectedDueAt, PDO::PARAM_INT);
        $statement->execute();
        return $statement->rowCount() === 1;
    }

    public function rescheduleExisting(string $category, string $itemName, int $dueAt): bool
    {
        $this->validateItem($category, $itemName);
        if ($dueAt < 1) {
            throw new InvalidArgumentException('Cleanup due time must be positive.');
        }
        $statement = $this->database->pdo()->prepare(
            'UPDATE cleanup_queue SET due_at = :due_at, updated_at = :updated_at
             WHERE category = :category AND item_name = :item_name'
        );
        $statement->bindValue('due_at', $dueAt, PDO::PARAM_INT);
        $statement->bindValue('updated_at', time(), PDO::PARAM_INT);
        $statement->bindValue('category', $category);
        $statement->bindValue('item_name', $itemName);
        $statement->execute();
        return $statement->rowCount() === 1;
    }

    /** @return list<array{item_name: string, due_at: int}> */
    public function due(string $category, int $now, int $limit): array
    {
        $this->validateCategory($category);
        if ($now < 1) {
            throw new InvalidArgumentException('Cleanup due time must be positive.');
        }
        if ($limit < 1 || $limit > 10000) {
            throw new InvalidArgumentException('Cleanup queue limit must be between 1 and 10000.');
        }

        $statement = $this->database->pdo()->prepare(
            'SELECT item_name, due_at
             FROM cleanup_queue
             WHERE category = :category AND due_at <= :now
             ORDER BY due_at, item_name
             LIMIT :limit'
        );
        $statement->bindValue('category', $category);
        $statement->bindValue('now', $now, PDO::PARAM_INT);
        $statement->bindValue('limit', $limit, PDO::PARAM_INT);
        $statement->execute();

        $items = [];
        foreach ($statement->fetchAll() as $row) {
            $itemName = (string) $row['item_name'];
            $this->validateItem($category, $itemName);
            $items[] = ['item_name' => $itemName, 'due_at' => (int) $row['due_at']];
        }
        return $items;
    }

    public function currentDue(string $category, string $itemName): ?int
    {
        $this->validateItem($category, $itemName);
        $statement = $this->database->pdo()->prepare(
            'SELECT due_at FROM cleanup_queue
             WHERE category = :category AND item_name = :item_name'
        );
        $statement->execute(['category' => $category, 'item_name' => $itemName]);
        $dueAt = $statement->fetchColumn();

        return $dueAt === false ? null : (int) $dueAt;
    }

    private function validateItem(string $category, string $itemName): void
    {
        if (preg_match($this->validateCategory($category), $itemName) !== 1) {
            throw new InvalidArgumentException('Invalid cleanup queue item name.');
        }
    }

    private function validateCategory(string $category): string
    {
        $pattern = self::PATTERNS[$category] ?? null;
        if ($pattern === null) {
            throw new InvalidArgumentException('Invalid cleanup queue category.');
        }

        return $pattern;
    }
}
