<?php

declare(strict_types=1);

namespace Hanazar\Chat\Tests;

use FilesystemIterator;
use Hanazar\Chat\AuthContext;
use Hanazar\Chat\Config;
use Hanazar\Chat\Database;
use Hanazar\Chat\EventService;
use Hanazar\Chat\MessageService;
use Hanazar\Chat\PermissionService;
use Hanazar\Chat\PresenceService;
use Hanazar\Chat\RoomService;
use Hanazar\Chat\UserService;
use PHPUnit\Framework\TestCase as PHPUnitTestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;

abstract class TestCase extends PHPUnitTestCase
{
    protected string $runtimeRoot;
    protected Config $config;
    protected Database $database;
    protected UserService $users;
    protected PermissionService $permissions;
    protected RoomService $rooms;
    protected MessageService $messages;
    protected EventService $events;
    protected PresenceService $presence;

    protected function setUp(): void
    {
        parent::setUp();

        $this->runtimeRoot = sys_get_temp_dir() . '/hanazar-chat-test-' . bin2hex(random_bytes(12));
        self::assertTrue(mkdir($this->runtimeRoot, 0700));
        self::assertSame(0700, fileperms($this->runtimeRoot) & 0777);

        foreach (['data', 'sessions', 'logs', 'rate-limits', 'backups'] as $directory) {
            self::assertTrue(mkdir($this->runtimeRoot . '/' . $directory, 0700));
        }

        $this->config = Config::fromArray($this->validConfigValues());
        $this->database = new Database($this->config);
        $this->database->initialize();
        $this->bootServices();
    }

    protected function tearDown(): void
    {
        if (isset($this->runtimeRoot) && str_starts_with(basename($this->runtimeRoot), 'hanazar-chat-test-')) {
            $this->removeTree($this->runtimeRoot);
        }

        parent::tearDown();
    }

    /** @return array<string, string> */
    protected function validConfigValues(): array
    {
        return [
            'APP_ENV' => 'testing',
            'APP_ORIGIN' => 'https://chat.example.test',
            'APP_HOST' => 'chat.example.test',
            'APP_KEY' => 'base64:' . base64_encode(random_bytes(32)),
            'PUBLIC_ROOT' => dirname(__DIR__) . '/public',
            'DB_PATH' => $this->runtimeRoot . '/data/chat.sqlite',
            'SESSION_PATH' => $this->runtimeRoot . '/sessions',
            'LOG_PATH' => $this->runtimeRoot . '/logs',
            'RATE_LIMIT_PATH' => $this->runtimeRoot . '/rate-limits',
            'BACKUP_PATH' => $this->runtimeRoot . '/backups',
            'TRUSTED_PROXIES' => '127.0.0.1,::1,10.0.0.0/8',
        ];
    }

    protected function bootServices(): void
    {
        $this->events = new EventService($this->database);
        $this->permissions = new PermissionService($this->database);
        $this->users = new UserService($this->database, $this->events);
        $this->rooms = new RoomService($this->database, $this->permissions, $this->events);
        $this->messages = new MessageService($this->database, $this->permissions, $this->events);
        $this->presence = new PresenceService($this->database, $this->events);
    }

    /** @return array<string, mixed> */
    protected function createUser(
        ?string $username = null,
        string $systemRole = 'user',
        string $password = 'Str0ng-Test-Pass!',
    ): array
    {
        $username ??= 'user_' . bin2hex(random_bytes(6));

        return $this->users->create([
            'username' => $username,
            'display_name' => $username,
            'password' => $password,
            'system_role' => $systemRole,
        ]);
    }

    protected function contextFor(int $userId): AuthContext
    {
        $statement = $this->database->connection()->prepare(
            'SELECT system_role, auth_version FROM users WHERE id = :id',
        );
        $statement->execute(['id' => $userId]);
        $user = $statement->fetch();

        if (!is_array($user)) {
            throw new RuntimeException('Test user does not exist.');
        }

        return new AuthContext($userId, (string) $user['system_role'], (int) $user['auth_version']);
    }

    protected function createDm(int $actorId, int $otherUserId): int
    {
        return (int) $this->rooms->createDm($this->contextFor($actorId), $otherUserId)['id'];
    }

    /** @param list<int> $memberIds */
    protected function createGroup(int $ownerId, array $memberIds = [], string $name = 'Test room'): int
    {
        return (int) $this->rooms->createGroup(
            $this->contextFor($ownerId),
            $name,
            $memberIds,
        )['id'];
    }

    private function removeTree(string $root): void
    {
        if (!is_dir($root)) {
            return;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST,
        );

        foreach ($iterator as $entry) {
            $entry->isDir() ? rmdir($entry->getPathname()) : unlink($entry->getPathname());
        }

        rmdir($root);
    }
}
