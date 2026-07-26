<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use RuntimeException;

final class SessionProvisioningRaceTest extends TestCase
{
    public function testPublicationAndActivationShareImmediateOwnershipFence(): void
    {
        $source = (string) file_get_contents(dirname(__DIR__) . '/app/SessionCleanupRegistry.php');
        $databaseSource = (string) file_get_contents(dirname(__DIR__) . '/app/Database.php');
        $pending = strpos($source, "scheduleNew('session_pending', \$reference, \$dueAt)");
        $publish = strpos($source, '$this->publishProvisioning($reference, $sessionFileName, $dueAt)', $pending);
        $immediate = strpos($source, '$this->database->immediate(', $publish);
        $ownership = strpos($source, "currentDue('session_pending', \$reference)", $immediate);
        $sidecar = strpos($source, '$this->createSidecar($reference, $sessionFileName);', $ownership);
        $activate = strpos($source, "'session_pending',\n                'session'", $sidecar);

        self::assertIsInt($pending);
        self::assertIsInt($publish);
        self::assertIsInt($immediate);
        self::assertIsInt($ownership);
        self::assertIsInt($sidecar);
        self::assertIsInt($activate);
        self::assertLessThan($publish, $pending);
        self::assertLessThan($immediate, $publish);
        self::assertLessThan($ownership, $immediate);
        self::assertLessThan($sidecar, $ownership);
        self::assertLessThan($activate, $sidecar);
        self::assertSame(1, substr_count($source, '$this->createSidecar($reference, $sessionFileName);'));
        self::assertStringContainsString("exec('BEGIN IMMEDIATE')", $databaseSource);
    }

    public function testCleanupWinnerPreventsLateSidecarPublication(): void
    {
        $reference = str_repeat('7', 64);
        $dueAt = time() + 3600;
        self::assertTrue($this->cleanupQueue->scheduleNew('session_pending', $reference, $dueAt));
        self::assertTrue($this->cleanupQueue->transitionIfDue(
            'session_pending',
            'session_delete',
            $reference,
            $dueAt,
            time()
        ));
        $publish = new \ReflectionMethod($this->sessionRegistry, 'publishProvisioning');

        try {
            $publish->invoke(
                $this->sessionRegistry,
                $reference,
                'sess_' . str_repeat('r', 32),
                $dueAt
            );
            self::fail('Provisioning published after cleanup acquired ownership.');
        } catch (\ReflectionException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            self::assertInstanceOf(RuntimeException::class, $exception->getPrevious() ?? $exception);
        }

        self::assertFalse(@lstat($this->sessionRegistry->sidecarPath($reference)));
        self::assertNull($this->cleanupQueue->currentDue('session', $reference));
        self::assertNotNull($this->cleanupQueue->currentDue('session_delete', $reference));
    }

    public function testFenceUsesCurrentPendingOwnerButPreservesIntendedExpiry(): void
    {
        $reference = str_repeat('6', 64);
        $intendedDueAt = time() + 3600;
        $deferredDueAt = $intendedDueAt + 60;
        self::assertTrue($this->cleanupQueue->scheduleNew(
            'session_pending',
            $reference,
            $deferredDueAt
        ));
        $publish = new \ReflectionMethod($this->sessionRegistry, 'publishProvisioning');

        $publish->invoke(
            $this->sessionRegistry,
            $reference,
            'sess_' . str_repeat('t', 32),
            $intendedDueAt
        );

        self::assertNull($this->cleanupQueue->currentDue('session_pending', $reference));
        self::assertSame($intendedDueAt, $this->cleanupQueue->currentDue('session', $reference));
        self::assertFileExists($this->sessionRegistry->sidecarPath($reference));
    }

    public function testRollbackAfterPublicationLeavesPendingRecoveryOwner(): void
    {
        $reference = str_repeat('8', 64);
        $sessionFileName = 'sess_' . str_repeat('s', 32);
        $dueAt = time() + 3600;
        self::assertTrue($this->cleanupQueue->scheduleNew('session_pending', $reference, $dueAt));
        $create = new \ReflectionMethod($this->sessionRegistry, 'createSidecar');

        try {
            $this->database->immediate(function (\PDO $_pdo) use (
                $create,
                $reference,
                $sessionFileName,
                $dueAt
            ): void {
                self::assertSame($dueAt, $this->cleanupQueue->currentDue('session_pending', $reference));
                $create->invoke($this->sessionRegistry, $reference, $sessionFileName);
                self::assertTrue($this->cleanupQueue->transitionIfDue(
                    'session_pending',
                    'session',
                    $reference,
                    $dueAt,
                    $dueAt
                ));
                throw new RuntimeException('simulated crash before commit');
            });
            self::fail('Simulated pre-commit crash did not roll back.');
        } catch (RuntimeException $exception) {
            self::assertSame('simulated crash before commit', $exception->getMessage());
        }

        self::assertSame($dueAt, $this->cleanupQueue->currentDue('session_pending', $reference));
        self::assertNull($this->cleanupQueue->currentDue('session', $reference));
        self::assertSame(
            $sessionFileName,
            file_get_contents($this->sessionRegistry->sidecarPath($reference))
        );
    }
}
