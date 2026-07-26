<?php

declare(strict_types=1);

namespace FlashPhoto;

final class SecurityHeaders
{
    /** @return array<string, string> */
    public static function forPublicPage(): array
    {
        return self::base() + [
            'Cache-Control' => 'no-store, private, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
            'X-Robots-Tag' => 'noindex, nofollow, noarchive, nosnippet, noimageindex',
        ];
    }

    /** @return array<string, string> */
    public static function forAdmin(): array
    {
        return self::forPublicPage();
    }

    /** @return array<string, string> */
    public static function forApi(): array
    {
        return self::forPublicPage() + ['Content-Type' => 'application/json; charset=utf-8'];
    }

    /** @return array<string, string> */
    public static function forImage(): array
    {
        return self::forPublicPage() + [
            'Content-Disposition' => 'inline',
            'Accept-Ranges' => 'none',
            'X-Accel-Buffering' => 'no',
        ];
    }

    /** @return array<string, string> */
    private static function base(): array
    {
        return [
            'Content-Security-Policy' => "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
            'X-Content-Type-Options' => 'nosniff',
            'Referrer-Policy' => 'no-referrer',
            'X-Frame-Options' => 'DENY',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
            'Cross-Origin-Resource-Policy' => 'same-origin',
            'Cross-Origin-Opener-Policy' => 'same-origin',
        ];
    }
}
