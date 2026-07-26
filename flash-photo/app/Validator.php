<?php

declare(strict_types=1);

namespace FlashPhoto;

use finfo;

final class Validator
{
    private const MIME_EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    private const DANGEROUS_EXTENSIONS = [
        'php', 'php3', 'php4', 'php5', 'php7', 'php8', 'phtml', 'pht', 'phar', 'cgi', 'pl', 'sh', 'svg', 'svgz',
    ];

    public function __construct(private readonly Config $config)
    {
    }

    /** @param array<string, mixed> $file @return array<string, int|string> */
    public function validateUpload(array $file): array
    {
        $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        if (!is_int($error) || $error !== UPLOAD_ERR_OK) {
            throw new ValidationException($this->uploadErrorMessage($error));
        }
        $path = $file['tmp_name'] ?? null;
        $name = $file['name'] ?? null;
        if (!is_string($path) || !is_string($name) || !is_uploaded_file($path)) {
            throw new ValidationException('上传文件无效');
        }
        return $this->validatePath($path, $name);
    }

    /** @return array<string, int|string> */
    public function validatePath(string $path, string $originalName): array
    {
        if (!is_file($path) || is_link($path) || !is_readable($path)) {
            throw new ValidationException('图片文件无效');
        }
        $size = @filesize($path);
        if ($size === false || $size < 1) {
            throw new ValidationException('不能上传空文件');
        }
        if ($size > $this->config->int('max_upload_bytes')) {
            throw new ValidationException('图片超过允许的大小');
        }
        $displayName = $this->safeDisplayName($originalName);
        $parts = array_map('strtolower', explode('.', $displayName));
        foreach (array_slice($parts, 1) as $extension) {
            if (in_array($extension, self::DANGEROUS_EXTENSIONS, true)) {
                throw new ValidationException('不允许上传此文件类型');
            }
        }
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($path);
        if (!is_string($mime) || !isset(self::MIME_EXTENSIONS[$mime])) {
            throw new ValidationException('仅支持 JPEG、PNG、WebP 和 GIF 图片');
        }
        $dimensions = @getimagesize($path);
        if (!is_array($dimensions) || !isset($dimensions[0], $dimensions[1], $dimensions['mime'])) {
            throw new ValidationException('图片已损坏或无法解析');
        }
        $width = (int) $dimensions[0];
        $height = (int) $dimensions[1];
        if ($width < 1 || $height < 1 || $dimensions['mime'] !== $mime) {
            throw new ValidationException('图片内容与类型不一致');
        }
        if ($width > intdiv(PHP_INT_MAX, $height) || $width * $height > $this->config->int('max_image_pixels')) {
            throw new ValidationException('图片像素尺寸超过限制');
        }
        return [
            'path' => $path,
            'original_name' => $displayName,
            'mime_type' => $mime,
            'extension' => self::MIME_EXTENSIONS[$mime],
            'file_size' => $size,
            'width' => $width,
            'height' => $height,
        ];
    }

    public function token(mixed $token): string
    {
        if (!is_string($token) || !preg_match('/^[A-Za-z0-9_-]{43}$/D', $token)) {
            throw new NotFoundException();
        }
        return $token;
    }

    private function safeDisplayName(string $name): string
    {
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';
        $name = trim($name);
        if ($name === '' || $name === '.' || $name === '..') {
            return 'image';
        }
        return mb_substr($name, 0, 180, 'UTF-8');
    }

    private function uploadErrorMessage(mixed $error): string
    {
        return match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => '图片超过服务器允许的大小',
            UPLOAD_ERR_PARTIAL => '图片上传不完整，请重试',
            UPLOAD_ERR_NO_FILE => '请选择图片',
            default => '图片上传失败，请重试',
        };
    }
}
