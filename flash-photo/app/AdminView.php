<?php

declare(strict_types=1);

namespace FlashPhoto;

final class AdminView
{
    public static function header(string $title, Config $config, Csrf $csrf, string $active = ''): void
    {
        Response::headers(SecurityHeaders::forAdmin());
        $base = self::escape($config->string('admin_path'));
        $titleText = self::escape($title);
        $csrfToken = self::escape($csrf->token());
        $links = [
            'dashboard' => ['概览', $base . '/index.php'],
            'upload' => ['上传', $base . '/upload.php'],
            'list' => ['记录', $base . '/list.php'],
        ];
        echo '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">';
        echo '<meta name="viewport" content="width=device-width,initial-scale=1">';
        echo '<title>' . $titleText . ' · 闪照管理</title>';
        echo '<link rel="icon" href="/favicon.svg" type="image/svg+xml">';
        echo '<link rel="stylesheet" href="/assets/app.css"></head><body class="admin-body">';
        echo '<a class="skip-link" href="#admin-main">跳到主要内容</a>';
        echo '<header class="admin-header"><a class="brand" href="' . $base . '/index.php">Flash Photo</a>';
        echo '<nav class="admin-nav" aria-label="管理导航">';
        foreach ($links as $key => [$label, $href]) {
            $class = $key === $active ? ' class="active"' : '';
            $current = $key === $active ? ' aria-current="page"' : '';
            echo '<a' . $class . $current . ' href="' . $href . '">' . self::escape($label) . '</a>';
        }
        echo '<form method="post" action="' . $base . '/logout.php">';
        echo '<input type="hidden" name="csrf_token" value="' . $csrfToken . '">';
        echo '<button class="link-button" type="submit">退出</button></form></nav></header>';
        echo '<main class="admin-main" id="admin-main" tabindex="-1"><div class="page-heading"><h1>' . $titleText . '</h1></div>';
    }

    public static function footer(): void
    {
        echo '</main><script src="/assets/admin.js" defer></script></body></html>';
    }

    public static function escape(mixed $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes . ' B';
        }
        if ($bytes < 1048576) {
            return number_format($bytes / 1024, 1) . ' KB';
        }
        return number_format($bytes / 1048576, 1) . ' MB';
    }

    public static function formatTime(mixed $timestamp, Config $config): string
    {
        if ($timestamp === null || (int) $timestamp < 1) {
            return '—';
        }
        $date = new \DateTimeImmutable('@' . (int) $timestamp);
        return $date->setTimezone(new \DateTimeZone($config->string('app_timezone')))->format('Y-m-d H:i:s');
    }
}
