<?php

declare(strict_types=1);

namespace FlashPhoto;

final class FileStorage
{
    private const REENCODE_BYTES_PER_PIXEL = 12;
    private const REENCODE_SOURCE_MULTIPLIER = 2;
    private const REENCODE_FIXED_OVERHEAD = 16 * 1024 * 1024;

    private string $root;
    private string $pendingRoot;
    /** @var array<string, resource> */
    private array $pendingLocks = [];

    public function __construct(
        private readonly Config $config,
        private readonly Logger $logger,
        private readonly RuntimeCleanupQueue $cleanupQueue
    ) {
        $this->root = rtrim($config->string('storage_path'), '/');
        if (!is_dir($this->root) && !mkdir($this->root, 0700, true) && !is_dir($this->root)) {
            throw new \RuntimeException('Unable to create encrypted storage directory.');
        }
        if (is_link($this->root)) {
            throw new \RuntimeException('Storage directory cannot be a symbolic link.');
        }
        $mode = @fileperms($this->root);
        if ($mode === false
            || ($mode & 0077) !== 0
            || !is_readable($this->root)
            || !is_writable($this->root)
            || !is_executable($this->root)) {
            throw new \RuntimeException('Storage directory permissions or access are unsafe.');
        }
        $this->pendingRoot = $this->root . '/.pending';
        if (!is_dir($this->pendingRoot)
            && !mkdir($this->pendingRoot, 0700)
            && !is_dir($this->pendingRoot)) {
            throw new \RuntimeException('Unable to create pending storage directory.');
        }
        $pendingMode = @fileperms($this->pendingRoot);
        if (is_link($this->pendingRoot)
            || $pendingMode === false
            || ($pendingMode & 0077) !== 0
            || !is_readable($this->pendingRoot)
            || !is_writable($this->pendingRoot)
            || !is_executable($this->pendingRoot)) {
            throw new \RuntimeException('Pending storage directory permissions or access are unsafe.');
        }
    }

    /** @param array<string, int|string> $image @return array{storage_name: string, file_size: int} */
    public function store(array $image): array
    {
        $source = (string) $image['path'];
        if (!is_file($source) || is_link($source)) {
            throw new ValidationException('上传临时文件无效');
        }
        $extension = (string) $image['extension'];
        $name = bin2hex(random_bytes(24)) . '.' . $extension;
        $destination = $this->root . '/' . $name;
        $temporary = $this->pendingRoot . '/.tmp-' . substr($name, 0, 48);
        $marker = $this->markerPath($name);
        if (file_exists($destination) || file_exists($temporary) || file_exists($marker)) {
            throw new \RuntimeException('Storage name collision.');
        }
        $mime = (string) $image['mime_type'];
        $reencode = $this->config->bool('reencode_uploads')
            && ($mime !== 'image/gif' || !$this->config->bool('preserve_gif_animation'))
            && $this->canReencode($mime);
        $mustReencode = $this->config->bool('reencode_uploads')
            && ($mime !== 'image/gif' || !$this->config->bool('preserve_gif_animation'));
        if ($mustReencode && !$reencode) {
            throw new \RuntimeException('The configured image encoder is unavailable.');
        }
        $markerHandle = null;
        $published = false;
        try {
            $this->cleanupQueue->schedule('pending', basename($marker), time() + 3600);
            $markerHandle = @fopen($marker, 'x+');
            if ($markerHandle === false
                || !@chmod($marker, 0600)
                || !flock($markerHandle, LOCK_EX | LOCK_NB)) {
                throw new \RuntimeException('Unable to reserve stored image publication.');
            }
            if (!$this->persistHandle($markerHandle) || !$this->syncDirectory($this->pendingRoot)) {
                throw new \RuntimeException('Unable to persist stored image reservation.');
            }
            $this->cleanupQueue->schedule('pending', basename($temporary), time() + 3600);
            $written = $reencode
                ? $this->reencode($image, $temporary)
                : @copy($source, $temporary);
            if (!$written || !is_file($temporary) || is_link($temporary)) {
                throw new \RuntimeException('Unable to store uploaded image.');
            }
            $size = @filesize($temporary);
            if ($size === false || $size < 1) {
                throw new \RuntimeException('Stored image is invalid.');
            }
            if ($size > $this->config->int('max_upload_bytes')) {
                throw new ValidationException('图片处理后超过大小限制');
            }
            if (!@chmod($temporary, 0600)) {
                throw new \RuntimeException('Unable to secure the uploaded image.');
            }
            if (!$this->persistFile($temporary)) {
                throw new \RuntimeException('Unable to persist uploaded image.');
            }
            if (!@link($temporary, $destination)) {
                throw new \RuntimeException('Unable to finalize uploaded image.');
            }
            $published = true;
            if (!@chmod($destination, 0600)) {
                throw new \RuntimeException('Unable to secure the stored image.');
            }
            $finalSize = @filesize($destination);
            if ($finalSize === false || $finalSize !== $size) {
                throw new \RuntimeException('Stored image is invalid.');
            }
            if (!$this->syncDirectory($this->root)) {
                throw new \RuntimeException('Unable to persist stored image publication.');
            }
            if (!$this->deletePendingArtifact($temporary)) {
                throw new \RuntimeException('Unable to durably remove temporary image.');
            }
            $this->pendingLocks[$name] = $markerHandle;
            return ['storage_name' => $name, 'file_size' => $finalSize];
        } catch (\Throwable $exception) {
            $this->deletePendingArtifact($temporary);
            $payloadRemoved = !$published || $this->deleteStoredArtifact($destination);
            if (!$payloadRemoved) {
                $this->logger->error('storage.rollback_deferred', [
                    'storage_hash' => hash('sha256', $name),
                ]);
            }
            if (is_resource($markerHandle)) {
                if ($payloadRemoved) {
                    $this->deletePendingArtifact($marker);
                }
                flock($markerHandle, LOCK_UN);
                fclose($markerHandle);
            } elseif ($payloadRemoved) {
                $this->deletePendingArtifact($marker);
            }
            throw $exception;
        }
    }

    public function confirm(string $storageName): void
    {
        $this->finishPending($storageName, false);
    }

    public function abort(string $storageName): void
    {
        $this->finishPending($storageName, true);
    }

    public function resolve(string $storageName): ?string
    {
        if (!$this->isSafeStorageName($storageName)) {
            return null;
        }
        $candidate = $this->root . '/' . $storageName;
        if (!is_file($candidate) || is_link($candidate)) {
            return null;
        }
        $root = realpath($this->root);
        $resolved = realpath($candidate);
        if ($root === false || $resolved === false || !str_starts_with($resolved, $root . DIRECTORY_SEPARATOR)) {
            return null;
        }
        return $resolved;
    }

    public function delete(string $storageName): bool
    {
        if (!$this->isSafeStorageName($storageName)) {
            $this->logger->error('storage.invalid_name', ['storage_hash' => hash('sha256', $storageName)]);
            return false;
        }
        $candidate = $this->root . '/' . $storageName;
        if (@lstat($candidate) === false) {
            if ($this->syncDirectory($this->root)) {
                return true;
            }
            $this->logger->error('storage.delete_failed', ['storage_hash' => hash('sha256', $storageName)]);
            return false;
        }
        if (is_link($candidate)) {
            if ($this->deleteStoredArtifact($candidate)) {
                return true;
            }
            $this->logger->error('storage.delete_failed', ['storage_hash' => hash('sha256', $storageName)]);
            return false;
        }
        $path = $this->resolve($storageName);
        if ($path === null) {
            $this->logger->error('storage.delete_failed', ['storage_hash' => hash('sha256', $storageName)]);
            return false;
        }
        if ($this->deleteStoredArtifact($path)) {
            return true;
        }
        $this->logger->error('storage.delete_failed', ['storage_hash' => hash('sha256', $storageName)]);
        return false;
    }

    public function isSafeStorageName(string $storageName): bool
    {
        return preg_match('/^[a-f0-9]{48}\.(?:jpg|png|webp|gif)$/D', $storageName) === 1;
    }

    private function finishPending(string $storageName, bool $deletePayload): void
    {
        if (!$this->isSafeStorageName($storageName)) {
            throw new \InvalidArgumentException('Invalid pending storage name.');
        }
        $handle = $this->pendingLocks[$storageName] ?? null;
        unset($this->pendingLocks[$storageName]);
        if ($deletePayload && !$this->delete($storageName)) {
            if (is_resource($handle)) {
                flock($handle, LOCK_UN);
                fclose($handle);
            }
            return;
        }
        $marker = $this->markerPath($storageName);
        if (!$this->deletePendingArtifact($marker)) {
            $this->logger->error('storage.marker_delete_failed', [
                'storage_hash' => hash('sha256', $storageName),
            ]);
        }
        if (is_resource($handle)) {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    private function deletePendingArtifact(string $path): bool
    {
        if (@lstat($path) !== false) {
            @unlink($path);
        }
        clearstatcache(true, $path);
        if (@lstat($path) !== false || !$this->syncDirectory($this->pendingRoot)) {
            return false;
        }
        try {
            $this->cleanupQueue->remove('pending', basename($path));
        } catch (\Throwable $exception) {
            $this->logger->error('storage.cleanup_queue_failed', [
                'item_hash' => hash('sha256', basename($path)),
                'exception_class' => $exception::class,
            ]);
        }
        return true;
    }

    private function deleteStoredArtifact(string $path): bool
    {
        if (@lstat($path) !== false) {
            @unlink($path);
        }
        clearstatcache(true, $path);
        return @lstat($path) === false && $this->syncDirectory($this->root);
    }

    /** @param resource $handle */
    private function persistHandle($handle): bool
    {
        $stat = @fstat($handle);
        if ($stat === false || (((int) $stat['mode']) & 0170000) !== 0100000 || !@fflush($handle)) {
            return false;
        }
        return function_exists('fsync') && @fsync($handle);
    }

    private function persistFile(string $path): bool
    {
        $pathStat = @lstat($path);
        if ($pathStat === false
            || (((int) $pathStat['mode']) & 0170000) !== 0100000
            || is_link($path)) {
            return false;
        }
        $handle = @fopen($path, 'r+b');
        if ($handle === false) {
            return false;
        }
        try {
            $openStat = @fstat($handle);
            return $openStat !== false
                && $openStat['dev'] === $pathStat['dev']
                && $openStat['ino'] === $pathStat['ino']
                && $this->persistHandle($handle);
        } finally {
            fclose($handle);
        }
    }

    private function syncDirectory(string $directory): bool
    {
        if (PHP_OS_FAMILY !== 'Linux') {
            return true;
        }
        if (!function_exists('fsync')) {
            return false;
        }
        $pathStat = @lstat($directory);
        if ($pathStat === false
            || (((int) $pathStat['mode']) & 0170000) !== 0040000
            || is_link($directory)) {
            return false;
        }
        $handle = @fopen($directory, 'r');
        if ($handle === false) {
            return false;
        }
        try {
            $openStat = @fstat($handle);
            return $openStat !== false
                && $openStat['dev'] === $pathStat['dev']
                && $openStat['ino'] === $pathStat['ino']
                && @fsync($handle);
        } finally {
            fclose($handle);
        }
    }

    private function markerPath(string $storageName): string
    {
        return $this->pendingRoot . '/' . $storageName . '.pending';
    }

    /** @param array<string, int|string> $image */
    private function reencode(array $image, string $destination): bool
    {
        if (!extension_loaded('gd')) {
            throw new \RuntimeException('GD is required when upload re-encoding is enabled.');
        }
        $this->assertReencodeMemoryAvailable($image);
        $source = (string) $image['path'];
        $mime = (string) $image['mime_type'];
        $image = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($source),
            'image/png' => @imagecreatefrompng($source),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($source) : false,
            'image/gif' => @imagecreatefromgif($source),
            default => false,
        };
        if ($image === false) {
            throw new ValidationException('图片无法安全解码');
        }
        if ($mime === 'image/png' || $mime === 'image/webp') {
            imagealphablending($image, false);
            imagesavealpha($image, true);
        }
        $result = match ($mime) {
            'image/jpeg' => imagejpeg($image, $destination, 90),
            'image/png' => imagepng($image, $destination, 6),
            'image/webp' => function_exists('imagewebp') ? imagewebp($image, $destination, 90) : false,
            'image/gif' => imagegif($image, $destination),
            default => false,
        };
        imagedestroy($image);
        return $result;
    }

    /** @param array<string, int|string> $image */
    private function assertReencodeMemoryAvailable(array $image): void
    {
        $required = memory_get_usage(true);
        $width = (int) $image['width'];
        $height = (int) $image['height'];
        $pixels = $width > 0 && $height > 0 && $width <= intdiv(PHP_INT_MAX, $height)
            ? $width * $height
            : PHP_INT_MAX;
        $required = $this->saturatingAdd($required, $pixels, self::REENCODE_BYTES_PER_PIXEL);
        $required = $this->saturatingAdd($required, (int) $image['file_size'], self::REENCODE_SOURCE_MULTIPLIER);
        $required = $this->saturatingAdd($required, self::REENCODE_FIXED_OVERHEAD);
        $limit = $this->memoryLimitBytes();
        if ($limit !== null && $required > $limit) {
            throw new ValidationException('服务器内存不足，无法安全处理此图片');
        }
    }

    private function saturatingAdd(int $total, int $value, int $multiplier = 1): int
    {
        if ($value < 0 || $value > intdiv(PHP_INT_MAX, $multiplier)) {
            return PHP_INT_MAX;
        }
        $addition = $value * $multiplier;
        return $total > PHP_INT_MAX - $addition ? PHP_INT_MAX : $total + $addition;
    }

    private function memoryLimitBytes(): ?int
    {
        $value = ini_get('memory_limit');
        if (!is_string($value)) {
            return 0;
        }
        $value = trim($value);
        if ($value === '-1') {
            return null;
        }
        if (preg_match('/^([0-9]+)([KMG]?)$/iD', $value, $matches) !== 1) {
            return 0;
        }
        $multiplier = match (strtoupper($matches[2])) {
            'K' => 1024,
            'M' => 1024 * 1024,
            'G' => 1024 * 1024 * 1024,
            default => 1,
        };
        $amount = (int) $matches[1];
        return $amount > intdiv(PHP_INT_MAX, $multiplier)
            ? PHP_INT_MAX
            : $amount * $multiplier;
    }

    private function canReencode(string $mime): bool
    {
        if (!extension_loaded('gd')) {
            return false;
        }
        return match ($mime) {
            'image/jpeg' => function_exists('imagecreatefromjpeg') && function_exists('imagejpeg'),
            'image/png' => function_exists('imagecreatefrompng') && function_exists('imagepng'),
            'image/webp' => function_exists('imagecreatefromwebp') && function_exists('imagewebp'),
            'image/gif' => function_exists('imagecreatefromgif') && function_exists('imagegif'),
            default => false,
        };
    }
}
