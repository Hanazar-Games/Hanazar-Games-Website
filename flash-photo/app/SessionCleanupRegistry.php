<?php

declare(strict_types=1);

namespace FlashPhoto;

use RuntimeException;

final class SessionCleanupRegistry
{
    private const RETIRE_RETRY_DELAY = 60;
    private const REFERENCE_PATTERN = '/^[a-f0-9]{64}$/D';
    private const SESSION_ID_PATTERN = '/^[A-Za-z0-9,-]{16,256}$/D';

    private readonly string $sessionDirectory;
    private readonly string $sidecarDirectory;

    public function __construct(Config $config, private readonly RuntimeCleanupQueue $cleanupQueue)
    {
        $this->sessionDirectory = dirname($config->string('storage_path')) . '/sessions';
        $this->assertDirectory($this->sessionDirectory, 0700);
        $this->sidecarDirectory = $this->sessionDirectory . '/.cleanup';
        if (@lstat($this->sidecarDirectory) === false) {
            if (!@mkdir($this->sidecarDirectory, 0700)
                || !$this->syncDirectory($this->sessionDirectory)) {
                throw new RuntimeException('Unable to create the Session cleanup registry.');
            }
        }
        $this->assertDirectory($this->sidecarDirectory, 0700);
    }

    public function track(string $sessionId, ?string $reference, int $dueAt): string
    {
        $sessionFileName = $this->sessionFileName($sessionId);
        if ($reference !== null) {
            $this->assertReference($reference);
            if (!$this->sidecarMatches($reference, $sessionFileName)) {
                throw new RuntimeException('Session cleanup reference is invalid.');
            }
            if (!$this->cleanupQueue->rescheduleExisting('session', $reference, $dueAt)) {
                throw new RuntimeException('Session cleanup reference is not active.');
            }
            return $reference;
        }

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $reference = bin2hex(random_bytes(32));
            if (!$this->cleanupQueue->scheduleNew('session_pending', $reference, $dueAt)) {
                continue;
            }
            try {
                $this->createSidecar($reference, $sessionFileName);
            } catch (\Throwable $exception) {
                $this->retireProvisioning($reference);
                throw $exception;
            }
            if ($this->activateProvisioning($reference, $sessionFileName, $dueAt)) {
                return $reference;
            }
            $this->retireProvisioning($reference);
            throw new RuntimeException('Unable to activate Session cleanup reference.');
        }
        throw new RuntimeException('Unable to allocate Session cleanup reference.');
    }

    public function discard(string $reference): void
    {
        $this->assertReference($reference);
        $deleteDueAt = null;
        for ($attempt = 0; $attempt < 3 && $deleteDueAt === null; $attempt++) {
            $dueAt = $this->cleanupQueue->currentDue('session', $reference);
            if ($dueAt === null) {
                $deleteDueAt = $this->cleanupQueue->currentDue('session_delete', $reference);
                break;
            }
            $candidateDueAt = time();
            if ($this->cleanupQueue->transitionIfDue('session', 'session_delete', $reference, $dueAt, $candidateDueAt)) {
                $deleteDueAt = $candidateDueAt;
            }
        }
        if ($deleteDueAt === null) {
            throw new RuntimeException('Unable to mark Session cleanup reference for deletion.');
        }
        if (!$this->syncDirectory($this->sessionDirectory) || !$this->removeSidecar($reference)) {
            throw new RuntimeException('Unable to remove Session cleanup reference.');
        }
        $this->cleanupQueue->removeIfDue('session_delete', $reference, $deleteDueAt);
    }

    public function persistSessionDirectory(): void
    {
        if (!$this->syncDirectory($this->sessionDirectory)) {
            throw new RuntimeException('Unable to persist Session deletion.');
        }
    }

    public function removeSidecar(string $reference): bool
    {
        $path = $this->sidecarPath($reference);
        $stat = @lstat($path);
        if ($stat === false) {
            return $this->syncDirectory($this->sidecarDirectory);
        }
        $type = ((int) $stat['mode']) & 0170000;
        if (($type !== 0100000 && $type !== 0120000) || !@unlink($path)) {
            return false;
        }
        clearstatcache(true, $path);
        return @lstat($path) === false && $this->syncDirectory($this->sidecarDirectory);
    }

    public function isSessionId(string $sessionId): bool
    {
        return preg_match(self::SESSION_ID_PATTERN, $sessionId) === 1;
    }

    public function assertConfiguredHandler(): void
    {
        $savePath = (string) ini_get('session.save_path');
        if (ini_get('session.save_handler') !== 'files'
            || $savePath !== $this->sessionDirectory
            || realpath($savePath) !== $this->sessionDirectory) {
            throw new RuntimeException('PHP Session storage is not configured safely.');
        }
    }

    public function isSessionFileName(string $fileName): bool
    {
        return str_starts_with($fileName, 'sess_') && $this->isSessionId(substr($fileName, 5));
    }

    public function sessionDirectory(): string
    {
        return $this->sessionDirectory;
    }

    public function sidecarDirectory(): string
    {
        return $this->sidecarDirectory;
    }

    public function sessionPath(string $sessionId): string
    {
        return $this->sessionDirectory . '/' . $this->sessionFileName($sessionId);
    }

    public function sidecarPath(string $reference): string
    {
        $this->assertReference($reference);
        return $this->sidecarDirectory . '/' . $reference;
    }

    private function createSidecar(string $reference, string $sessionFileName): void
    {
        $path = $this->sidecarPath($reference);
        $handle = @fopen($path, 'x');
        if ($handle === false) {
            throw new RuntimeException('Unable to create Session cleanup reference.');
        }
        try {
            if (!@chmod($path, 0600) || !flock($handle, LOCK_EX)) {
                throw new RuntimeException('Unable to secure Session cleanup reference.');
            }
            $written = fwrite($handle, $sessionFileName);
            if ($written !== strlen($sessionFileName) || !fflush($handle)) {
                throw new RuntimeException('Unable to write Session cleanup reference.');
            }
            if (!function_exists('fsync') || !@fsync($handle)) {
                throw new RuntimeException('Unable to persist Session cleanup reference.');
            }
        } catch (\Throwable $exception) {
            fclose($handle);
            throw $exception;
        }
        flock($handle, LOCK_UN);
        fclose($handle);
        clearstatcache(true, $path);
        if ((@fileperms($path) & 0777) !== 0600) {
            throw new RuntimeException('Session cleanup reference permissions are invalid.');
        }
        if (!$this->syncDirectory($this->sidecarDirectory)) {
            throw new RuntimeException('Unable to persist Session cleanup reference.');
        }
    }

    private function activateProvisioning(
        string $reference,
        string $sessionFileName,
        int $intendedDueAt
    ): bool {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $pendingDueAt = $this->cleanupQueue->currentDue('session_pending', $reference);
            if ($pendingDueAt === null) {
                break;
            }
            if ($this->cleanupQueue->transitionIfDue(
                'session_pending',
                'session',
                $reference,
                $pendingDueAt,
                $intendedDueAt
            )) {
                return true;
            }
        }
        return $this->cleanupQueue->currentDue('session', $reference) !== null
            && $this->sidecarMatches($reference, $sessionFileName);
    }

    private function retireProvisioning(string $reference): bool
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            if ($this->cleanupQueue->currentDue('session', $reference) !== null) {
                return false;
            }
            $deleteDueAt = $this->cleanupQueue->currentDue('session_delete', $reference);
            if ($deleteDueAt !== null) {
                if ($this->cleanupQueue->deferIfDue(
                    'session_delete',
                    $reference,
                    $deleteDueAt,
                    max(time() + self::RETIRE_RETRY_DELAY, $deleteDueAt + 1)
                )) {
                    return true;
                }
                continue;
            }
            $pendingDueAt = $this->cleanupQueue->currentDue('session_pending', $reference);
            if ($pendingDueAt !== null) {
                $deleteDueAt = time();
                if ($this->cleanupQueue->transitionIfDue(
                    'session_pending',
                    'session_delete',
                    $reference,
                    $pendingDueAt,
                    $deleteDueAt
                )) {
                    return true;
                }
                continue;
            }
            if ($this->cleanupQueue->currentDue('session', $reference) !== null) {
                return false;
            }
            if ($this->cleanupQueue->currentDue('session_delete', $reference) !== null
                || $this->cleanupQueue->currentDue('session_pending', $reference) !== null) {
                continue;
            }
            return $this->removeSidecar($reference);
        }
        return false;
    }

    private function sidecarMatches(string $reference, string $sessionFileName): bool
    {
        $path = $this->sidecarPath($reference);
        $stat = @lstat($path);
        if ($stat === false
            || (((int) $stat['mode']) & 0170000) !== 0100000
            || (((int) $stat['mode']) & 0777) !== 0600) {
            return false;
        }
        $handle = @fopen($path, 'r');
        if ($handle === false) {
            return false;
        }
        try {
            if (!flock($handle, LOCK_SH)) {
                return false;
            }
            $contents = stream_get_contents($handle, 262);
            return is_string($contents) && $contents === $sessionFileName && feof($handle);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    private function sessionFileName(string $sessionId): string
    {
        if (!$this->isSessionId($sessionId)) {
            throw new RuntimeException('Invalid PHP Session ID.');
        }
        return 'sess_' . $sessionId;
    }

    private function assertReference(string $reference): void
    {
        if (preg_match(self::REFERENCE_PATTERN, $reference) !== 1) {
            throw new RuntimeException('Invalid Session cleanup reference.');
        }
    }

    private function syncDirectory(string $directory): bool
    {
        $pathStat = @lstat($directory);
        if ($pathStat === false
            || (((int) $pathStat['mode']) & 0170000) !== 0040000
            || is_link($directory)
            || !function_exists('fsync')) {
            return false;
        }
        $handle = @fopen($directory, 'r');
        if ($handle === false) {
            return false;
        }
        try {
            $openStat = @fstat($handle);
            return $openStat !== false
                && (int) $openStat['dev'] === (int) $pathStat['dev']
                && (int) $openStat['ino'] === (int) $pathStat['ino']
                && @fsync($handle);
        } finally {
            fclose($handle);
        }
    }

    private function assertDirectory(string $path, int $requiredMode): void
    {
        clearstatcache(true, $path);
        $stat = @lstat($path);
        if ($stat === false
            || (((int) $stat['mode']) & 0170000) !== 0040000
            || (((int) $stat['mode']) & 0777) !== $requiredMode
            || realpath($path) !== $path
            || !is_readable($path)
            || !is_writable($path)
            || !is_executable($path)) {
            throw new RuntimeException('Session cleanup directory is unavailable or unsafe.');
        }
    }
}
