<?php

declare(strict_types=1);

namespace Hanazar\Chat;

final readonly class ClientIdentity
{
    private function __construct(private string $ip, private bool $secure) {}

    /** @param array<string, string> $server @param list<string> $trustedProxies */
    public static function resolve(array $server, array $trustedProxies): self
    {
        $peer = filter_var($server['REMOTE_ADDR'] ?? '', FILTER_VALIDATE_IP) ?: '0.0.0.0';
        $secure = ($server['HTTPS'] ?? '') !== '' && strtolower($server['HTTPS']) !== 'off';
        if (!self::matchesAny($peer, $trustedProxies)) {
            return new self($peer, $secure);
        }

        $forwarded = $server['HTTP_X_FORWARDED_FOR'] ?? '';
        $proto = strtolower($server['HTTP_X_FORWARDED_PROTO'] ?? '');
        if ($forwarded === '' || str_contains($forwarded, "\r") || str_contains($forwarded, "\n") || !in_array($proto, ['http', 'https'], true)) {
            return new self($peer, false);
        }
        $hops = array_map('trim', explode(',', $forwarded));
        foreach ($hops as $hop) {
            if (filter_var($hop, FILTER_VALIDATE_IP) === false) {
                return new self($peer, false);
            }
        }
        $hops[] = $peer;
        for ($index = count($hops) - 1; $index >= 0; --$index) {
            if (!self::matchesAny($hops[$index], $trustedProxies)) {
                return new self($hops[$index], $proto === 'https');
            }
        }

        return new self($hops[0], $proto === 'https');
    }

    /** @param list<string> $ranges */
    private static function matchesAny(string $ip, array $ranges): bool
    {
        $packedIp = @inet_pton($ip);
        if ($packedIp === false) {
            return false;
        }
        foreach ($ranges as $range) {
            if (substr_count($range, '/') > 1) {
                continue;
            }
            [$network, $bits] = array_pad(explode('/', $range, 2), 2, null);
            $packedNetwork = @inet_pton($network);
            if ($packedNetwork === false || strlen($packedIp) !== strlen($packedNetwork)) {
                continue;
            }
            if ($bits === null) {
                if (hash_equals($packedNetwork, $packedIp)) {
                    return true;
                }
                continue;
            }
            if (preg_match('/^[0-9]{1,3}$/D', $bits) !== 1) {
                continue;
            }
            $prefix = (int) $bits;
            if ($prefix < 1 || $prefix > strlen($packedIp) * 8) {
                continue;
            }
            $bytes = intdiv($prefix, 8);
            $remainder = $prefix % 8;
            if (substr($packedIp, 0, $bytes) !== substr($packedNetwork, 0, $bytes)) {
                continue;
            }
            if ($remainder === 0 || ((ord($packedIp[$bytes]) ^ ord($packedNetwork[$bytes])) & (0xff << (8 - $remainder))) === 0) {
                return true;
            }
        }
        return false;
    }

    public function ip(): string { return $this->ip; }
    public function isSecure(): bool { return $this->secure; }
}
