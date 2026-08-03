<?php

declare(strict_types=1);

namespace Hanazar\Chat;

final class SecurityHeaders
{
    /** @return array<string, string> */
    public static function html(bool $secure): array
    {
        $headers = [
            'Content-Type' => 'text/html; charset=utf-8',
            'Cache-Control' => 'no-store',
            'Content-Security-Policy' => "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
            'Referrer-Policy' => 'no-referrer',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
        ];
        if ($secure) {
            $headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
        }
        return $headers;
    }

    /** @return array<string, string> */
    public static function json(bool $secure): array
    {
        return array_merge(self::html($secure), ['Content-Type' => 'application/json; charset=utf-8']);
    }
}
