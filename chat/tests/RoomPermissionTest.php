<?php

declare(strict_types=1);

namespace Hanazar\Chat\Tests;

use Hanazar\Chat\HttpException;
use PDO;
use Throwable;

final class RoomPermissionTest extends TestCase
{
    public function testUsernamesAreUniqueRegardlessOfCase(): void
    {
        $this->user('Alice');

        $this->assertHttpStatus(409, fn () => $this->user('alice'));
    }

    public function testDmCreationIsUniqueAndIdempotentInBothDirections(): void
    {
        $alice = $this->user('alice');
        $bob = $this->user('bob');

        $first = $this->rooms->createDm($this->contextFor($alice['id']), $bob['id']);
        $retry = $this->rooms->createDm($this->contextFor($alice['id']), $bob['id']);
        $reverse = $this->rooms->createDm($this->contextFor($bob['id']), $alice['id']);

        self::assertSame($first['id'], $retry['id']);
        self::assertSame($first['id'], $reverse['id']);
        self::assertSame(1, $this->roomCount('dm'));
        $this->assertHttpStatus(
            422,
            fn () => $this->rooms->createDm($this->contextFor($alice['id']), $alice['id'])
        );
    }

    public function testGroupHasExactlyOneOwner(): void
    {
        $owner = $this->user('owner');
        $member = $this->user('member');
        $room = $this->rooms->createGroup(
            $this->contextFor($owner['id']),
            'Private room',
            [$member['id']]
        );

        $this->assertHttpStatus(
            409,
            fn () => $this->rooms->setRole(
                $this->contextFor($owner['id']),
                $room['id'],
                $member['id'],
                'owner'
            )
        );
        self::assertSame(1, $this->activeRoleCount($room['id'], 'owner'));
    }

    public function testOwnerCanManageGroupAndCannotLeaveBeforeTransfer(): void
    {
        $owner = $this->user('owner');
        $member = $this->user('member');
        $newMember = $this->user('newmember');
        $roomId = $this->createGroup($owner['id'], [$member['id']], 'Original');
        $context = $this->contextFor($owner['id']);

        $this->rooms->rename($context, $roomId, 'Renamed');
        $this->rooms->addMember($context, $roomId, $newMember['id']);
        $this->rooms->setRole($context, $roomId, $member['id'], 'admin');

        self::assertSame('Renamed', $this->rooms->get($context, $roomId)['name']);
        self::assertSame('admin', $this->activeRole($roomId, $member['id']));
        self::assertSame('member', $this->activeRole($roomId, $newMember['id']));
        $this->assertHttpStatus(409, fn () => $this->rooms->leave($context, $roomId));
    }

    public function testAdminCanManageOrdinaryMembersButNotPrivilegedMembers(): void
    {
        $owner = $this->user('owner');
        $admin = $this->user('admin');
        $peerAdmin = $this->user('peeradmin');
        $member = $this->user('member');
        $candidate = $this->user('candidate');
        $roomId = $this->createGroup(
            $owner['id'],
            [$admin['id'], $peerAdmin['id'], $member['id']],
            'Team'
        );
        $ownerContext = $this->contextFor($owner['id']);
        $adminContext = $this->contextFor($admin['id']);
        $this->rooms->setRole($ownerContext, $roomId, $admin['id'], 'admin');
        $this->rooms->setRole($ownerContext, $roomId, $peerAdmin['id'], 'admin');

        $this->rooms->rename($adminContext, $roomId, 'Admin renamed');
        $this->rooms->addMember($adminContext, $roomId, $candidate['id']);
        $this->rooms->removeMember($adminContext, $roomId, $member['id']);

        self::assertSame('Admin renamed', $this->rooms->get($adminContext, $roomId)['name']);
        self::assertSame('member', $this->activeRole($roomId, $candidate['id']));
        self::assertNull($this->activeRole($roomId, $member['id']));
        $this->assertHttpStatus(
            403,
            fn () => $this->rooms->removeMember($adminContext, $roomId, $owner['id'])
        );
        $this->assertHttpStatus(
            403,
            fn () => $this->rooms->removeMember($adminContext, $roomId, $peerAdmin['id'])
        );
        $this->assertHttpStatus(
            403,
            fn () => $this->rooms->setRole($adminContext, $roomId, $candidate['id'], 'admin')
        );
        $this->assertHttpStatus(
            403,
            fn () => $this->rooms->transferOwnership($adminContext, $roomId, $candidate['id'])
        );
        $this->assertHttpStatus(403, fn () => $this->rooms->archive($adminContext, $roomId));
    }

    public function testMemberCanReadAndLeaveButCannotManageGroup(): void
    {
        $owner = $this->user('owner');
        $member = $this->user('member');
        $candidate = $this->user('candidate');
        $roomId = $this->createGroup($owner['id'], [$member['id']], 'Team');
        $context = $this->contextFor($member['id']);

        self::assertSame($roomId, $this->rooms->get($context, $roomId)['id']);
        self::assertContains($roomId, array_column($this->rooms->list($context), 'id'));
        $this->assertHttpStatus(403, fn () => $this->rooms->rename($context, $roomId, 'Nope'));
        $this->assertHttpStatus(
            403,
            fn () => $this->rooms->addMember($context, $roomId, $candidate['id'])
        );
        $this->assertHttpStatus(
            403,
            fn () => $this->rooms->removeMember($context, $roomId, $owner['id'])
        );
        $this->assertHttpStatus(
            403,
            fn () => $this->rooms->setRole($context, $roomId, $member['id'], 'admin')
        );
        $this->assertHttpStatus(403, fn () => $this->rooms->archive($context, $roomId));

        $this->rooms->leave($context, $roomId);
        self::assertNull($this->activeRole($roomId, $member['id']));
    }

    public function testSystemAdminHasNoImplicitRoomAccessOrPrivileges(): void
    {
        $owner = $this->user('owner');
        $systemAdmin = $this->user('systemadmin', 'admin');
        $candidate = $this->user('candidate');
        $roomId = $this->createGroup($owner['id'], [], 'Private');
        $adminContext = $this->contextFor($systemAdmin['id']);

        $this->assertHttpStatus(404, fn () => $this->rooms->get($adminContext, $roomId));
        self::assertNotContains($roomId, array_column($this->rooms->list($adminContext), 'id'));

        $this->rooms->addMember($this->contextFor($owner['id']), $roomId, $systemAdmin['id']);
        self::assertSame($roomId, $this->rooms->get($adminContext, $roomId)['id']);
        $this->assertHttpStatus(
            403,
            fn () => $this->rooms->addMember($adminContext, $roomId, $candidate['id'])
        );
        $this->assertHttpStatus(403, fn () => $this->rooms->archive($adminContext, $roomId));
    }

    public function testRemovedMemberCanRejoinWithoutOverwritingMembershipHistory(): void
    {
        $owner = $this->user('owner');
        $member = $this->user('member');
        $roomId = $this->createGroup($owner['id'], [$member['id']], 'Team');
        $context = $this->contextFor($owner['id']);

        $this->rooms->removeMember($context, $roomId, $member['id']);
        $this->assertHttpStatus(404, fn () => $this->rooms->get(
            $this->contextFor($member['id']),
            $roomId
        ));
        $this->rooms->addMember($context, $roomId, $member['id']);

        $statement = $this->database->connection()->prepare(
            'SELECT role, left_at FROM room_members WHERE room_id = :room_id AND user_id = :user_id ORDER BY id'
        );
        $statement->execute(['room_id' => $roomId, 'user_id' => $member['id']]);
        $history = $statement->fetchAll(PDO::FETCH_ASSOC);
        self::assertCount(2, $history);
        self::assertNotNull($history[0]['left_at']);
        self::assertNull($history[1]['left_at']);
        self::assertSame('member', $history[1]['role']);
    }

    public function testOwnershipTransferIsAtomicAndDemotesPreviousOwnerToAdmin(): void
    {
        $owner = $this->user('owner');
        $successor = $this->user('successor');
        $roomId = $this->createGroup($owner['id'], [$successor['id']], 'Team');

        $this->rooms->transferOwnership(
            $this->contextFor($owner['id']),
            $roomId,
            $successor['id']
        );

        self::assertSame('admin', $this->activeRole($roomId, $owner['id']));
        self::assertSame('owner', $this->activeRole($roomId, $successor['id']));
        self::assertSame(1, $this->activeRoleCount($roomId, 'owner'));
        $this->assertHttpStatus(
            403,
            fn () => $this->rooms->archive($this->contextFor($owner['id']), $roomId)
        );
        $this->rooms->archive($this->contextFor($successor['id']), $roomId);
    }

    public function testArchivedGroupRemainsReadableAndRejectsAllRoomWrites(): void
    {
        $owner = $this->user('owner');
        $member = $this->user('member');
        $candidate = $this->user('candidate');
        $roomId = $this->createGroup($owner['id'], [$member['id']], 'Team');
        $ownerContext = $this->contextFor($owner['id']);
        $this->rooms->archive($ownerContext, $roomId);

        $room = $this->rooms->get($this->contextFor($member['id']), $roomId);
        self::assertSame($roomId, $room['id']);
        self::assertTrue($room['archived']);
        $this->assertHttpStatus(409, fn () => $this->rooms->rename($ownerContext, $roomId, 'Nope'));
        $this->assertHttpStatus(
            409,
            fn () => $this->rooms->addMember($ownerContext, $roomId, $candidate['id'])
        );
        $this->assertHttpStatus(
            409,
            fn () => $this->rooms->removeMember($ownerContext, $roomId, $member['id'])
        );
        $this->assertHttpStatus(
            409,
            fn () => $this->rooms->setRole($ownerContext, $roomId, $member['id'], 'admin')
        );
        $this->assertHttpStatus(
            409,
            fn () => $this->rooms->transferOwnership($ownerContext, $roomId, $member['id'])
        );
        $this->assertHttpStatus(
            409,
            fn () => $this->rooms->leave($this->contextFor($member['id']), $roomId)
        );
    }

    public function testInaccessibleAndUnknownRoomsAreIndistinguishable(): void
    {
        $owner = $this->user('owner');
        $outsider = $this->user('outsider');
        $roomId = $this->createGroup($owner['id'], [], 'Private');
        $context = $this->contextFor($outsider['id']);

        $inaccessible = $this->captureHttpException(fn () => $this->rooms->get($context, $roomId));
        $unknown = $this->captureHttpException(fn () => $this->rooms->get($context, 2147483647));

        self::assertSame(404, $inaccessible->status());
        self::assertSame(404, $unknown->status());
        self::assertSame($unknown->errorCode(), $inaccessible->errorCode());
    }

    public function testGroupCreationFansOutEventsWithoutDuplicatingMessageContent(): void
    {
        $owner = $this->user('owner');
        $first = $this->user('first');
        $second = $this->user('second');
        $room = $this->rooms->createGroup(
            $this->contextFor($owner['id']),
            'Team',
            [$first['id'], $second['id']]
        );

        $statement = $this->database->connection()->prepare(
            'SELECT DISTINCT user_id FROM user_events WHERE room_id = :room_id ORDER BY user_id'
        );
        $statement->execute(['room_id' => $room['id']]);
        $recipients = array_map('intval', $statement->fetchAll(PDO::FETCH_COLUMN));
        $expected = [$owner['id'], $first['id'], $second['id']];
        sort($expected);

        self::assertSame($expected, $recipients);
        $columns = $this->database->connection()
            ->query('PRAGMA table_info(user_events)')
            ->fetchAll(PDO::FETCH_ASSOC);
        $columnNames = array_column($columns, 'name');
        self::assertNotContains('body', $columnNames);
        self::assertNotContains('payload', $columnNames);
    }

    public function testRoomMutationRollsBackWhenEventFanOutFails(): void
    {
        $owner = $this->user('owner');
        $member = $this->user('member');
        $roomId = $this->createGroup($owner['id'], [], 'Team');
        $pdo = $this->database->connection();
        $pdo->exec(
            "CREATE TEMP TRIGGER fail_room_event BEFORE INSERT ON user_events "
            . "BEGIN SELECT RAISE(ABORT, 'forced event failure'); END"
        );

        $failed = false;
        try {
            $this->rooms->addMember(
                $this->contextFor($owner['id']),
                $roomId,
                $member['id']
            );
        } catch (Throwable) {
            $failed = true;
        }

        self::assertTrue($failed, 'Room mutation committed without its event.');
        self::assertNull($this->activeRole($roomId, $member['id']));
    }

    private function user(?string $username = null, string $role = 'user'): array
    {
        return $this->createUser($username, $role, 'Test-password-123!');
    }

    private function roomCount(string $kind): int
    {
        $statement = $this->database->connection()->prepare('SELECT COUNT(*) FROM rooms WHERE kind = :kind');
        $statement->execute(['kind' => $kind]);
        return (int) $statement->fetchColumn();
    }

    private function activeRoleCount(int $roomId, string $role): int
    {
        $statement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM room_members WHERE room_id = :room_id AND role = :role AND left_at IS NULL'
        );
        $statement->execute(['room_id' => $roomId, 'role' => $role]);
        return (int) $statement->fetchColumn();
    }

    private function activeRole(int $roomId, int $userId): ?string
    {
        $statement = $this->database->connection()->prepare(
            'SELECT role FROM room_members WHERE room_id = :room_id AND user_id = :user_id '
            . 'AND left_at IS NULL'
        );
        $statement->execute(['room_id' => $roomId, 'user_id' => $userId]);
        $role = $statement->fetchColumn();
        return $role === false ? null : (string) $role;
    }

    private function assertHttpStatus(int $status, callable $operation): HttpException
    {
        $exception = $this->captureHttpException($operation);
        self::assertSame($status, $exception->status());
        return $exception;
    }

    private function captureHttpException(callable $operation): HttpException
    {
        try {
            $operation();
        } catch (HttpException $exception) {
            return $exception;
        }

        self::fail('Expected an HTTP exception.');
    }
}
