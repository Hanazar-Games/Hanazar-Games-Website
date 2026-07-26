<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use FlashPhoto\Config;
use FlashPhoto\FileStorage;
use FlashPhoto\Logger;
use FlashPhoto\ValidationException;
use FlashPhoto\Validator;

final class UploadValidationTest extends TestCase
{
    public function testPhpPayloadAndFakeJpegAreRejected(): void
    {
        $validator = new Validator($this->config);
        foreach (['shell.php', 'shell.php.jpg'] as $name) {
            $path = $this->root . '/' . $name;
            file_put_contents($path, '<?php echo 1;');
            try {
                $validator->validatePath($path, $name);
                self::fail('Payload was accepted');
            } catch (ValidationException) {
                self::assertTrue(true);
            }
        }
    }

    public function testSvgIsRejected(): void
    {
        $validator = new Validator($this->config);
        $svg = $this->root . '/image.svg';
        file_put_contents($svg, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
        $this->expectException(ValidationException::class);
        $validator->validatePath($svg, 'image.svg');
    }

    public function testOversizedFileIsRejectedBeforeDecoding(): void
    {
        $large = $this->root . '/large.jpg';
        file_put_contents($large, str_repeat('x', 1048577));
        $this->expectException(ValidationException::class);
        (new Validator($this->config))->validatePath($large, 'large.jpg');
    }

    public function testPathTraversalFilenameIsReducedToDisplayName(): void
    {
        $image = (new Validator($this->config))->validatePath(
            (string) $this->validPng()['path'],
            '../../sample.png'
        );
        self::assertSame('sample.png', $image['original_name']);
    }

    public function testFinalStoredArtifactCannotExceedConfiguredLimit(): void
    {
        $values = $this->configValues;
        $values['max_upload_bytes'] = 1;
        $values['reencode_uploads'] = false;
        $config = Config::fromArray($values);
        $storage = new FileStorage($config, new Logger($config, $this->cleanupQueue), $this->cleanupQueue);

        try {
            $storage->store($this->validPng());
            self::fail('Oversized stored artifact was accepted.');
        } catch (ValidationException $exception) {
            self::assertSame('图片处理后超过大小限制', $exception->getMessage());
            $this->assertStorageDirectoryEmpty($config);
        }
    }

    public function testReencodedArtifactUsesFinalSizeLimit(): void
    {
        if (!extension_loaded('gd') || !function_exists('imagecreatefrompng') || !function_exists('imagepng')) {
            self::markTestSkipped('PNG support in GD is unavailable.');
        }
        $values = $this->configValues;
        $values['max_upload_bytes'] = 1;
        $values['reencode_uploads'] = true;
        $config = Config::fromArray($values);
        $storage = new FileStorage($config, new Logger($config, $this->cleanupQueue), $this->cleanupQueue);

        try {
            $storage->store($this->validPng());
            self::fail('Oversized re-encoded artifact was accepted.');
        } catch (ValidationException $exception) {
            self::assertSame('图片处理后超过大小限制', $exception->getMessage());
            $this->assertStorageDirectoryEmpty($config);
        }
    }

    public function testReencodeRejectsImageWhenMemoryEstimateExceedsLimit(): void
    {
        if (!extension_loaded('gd') || !function_exists('imagecreatefrompng') || !function_exists('imagepng')) {
            self::markTestSkipped('PNG support in GD is unavailable.');
        }
        $previousLimit = ini_get('memory_limit');
        $limit = (intdiv(memory_get_usage(true), 1048576) + 32) . 'M';
        if (!is_string($previousLimit) || @ini_set('memory_limit', $limit) === false || ini_get('memory_limit') !== $limit) {
            if (is_string($previousLimit)) {
                @ini_set('memory_limit', $previousLimit);
            }
            self::markTestSkipped('memory_limit cannot be changed safely.');
        }

        try {
            $values = $this->configValues;
            $values['reencode_uploads'] = true;
            $config = Config::fromArray($values);
            $storage = new FileStorage($config, new Logger($config, $this->cleanupQueue), $this->cleanupQueue);
            $image = $this->validPng();
            $image['width'] = 1000000;
            $image['height'] = 1000000;

            try {
                $storage->store($image);
                self::fail('Image exceeding the GD memory budget was accepted.');
            } catch (ValidationException $exception) {
                self::assertSame('服务器内存不足，无法安全处理此图片', $exception->getMessage());
                $this->assertStorageDirectoryEmpty($config);
            }
        } finally {
            @ini_set('memory_limit', $previousLimit);
        }
    }

    public function testPreservedGifIsCopiedWithoutGdMemoryEstimate(): void
    {
        $path = $this->root . '/sample.gif';
        file_put_contents($path, base64_decode(
            'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            true
        ));
        $image = (new Validator($this->config))->validatePath($path, 'sample.gif');
        $image['width'] = 1000000;
        $image['height'] = 1000000;
        $values = $this->configValues;
        $values['reencode_uploads'] = true;
        $values['preserve_gif_animation'] = true;
        $config = Config::fromArray($values);
        $storage = new FileStorage($config, new Logger($config, $this->cleanupQueue), $this->cleanupQueue);

        $stored = $storage->store($image);
        $storedPath = $storage->resolve($stored['storage_name']);

        self::assertNotNull($storedPath);
        self::assertSame(file_get_contents($path), file_get_contents($storedPath));
        $storage->confirm($stored['storage_name']);
    }

    private function assertStorageDirectoryEmpty(Config $config): void
    {
        $entries = array_values(array_diff(
            scandir($config->string('storage_path')) ?: [],
            ['.', '..']
        ));
        self::assertSame(['.pending'], $entries);
        self::assertSame([], array_values(array_diff(
            scandir($config->string('storage_path') . '/.pending') ?: [],
            ['.', '..']
        )));
    }
}
