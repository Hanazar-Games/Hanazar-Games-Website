<?php

declare(strict_types=1);

namespace FlashPhoto;

final class ClientIdentity
{
    public function __construct(private readonly Config $config)
    {
    }

    public function ip(): string
    {
        $remote = $this->validIp($_SERVER['REMOTE_ADDR'] ?? '') ?? '0.0.0.0';
        if (!$this->isTrustedProxy($remote)) {
            return $remote;
        }
        $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if (!is_string($forwarded) || $forwarded === '') {
            return $remote;
        }
        $chain = array_values(array_filter(array_map(
            fn (string $value): ?string => $this->validIp(trim($value)),
            explode(',', $forwarded)
        )));
        $chain[] = $remote;
        for ($index = count($chain) - 1; $index >= 0; $index--) {
            if (!$this->isTrustedProxy($chain[$index])) {
                return $chain[$index];
            }
        }
        return $remote;
    }

    public function ipHash(): string
    {
        return hash_hmac('sha256', $this->ip(), $this->config->string('ip_hash_secret'));
    }

    public function userAgentHash(): string
    {
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        if (!is_string($userAgent)) {
            $userAgent = '';
        }
        return hash_hmac('sha256', substr($userAgent, 0, 1024), $this->config->string('ip_hash_secret'));
    }

    private function validIp(string $value): ?string
    {
        return filter_var($value, FILTER_VALIDATE_IP) !== false ? $value : null;
    }

    private function isTrustedProxy(string $ip): bool
    {
        foreach ($this->config->array('trusted_proxies') as $range) {
            if (is_string($range) && $this->ipInRange($ip, $range)) {
                return true;
            }
        }
        return false;
    }

    private function ipInRange(string $ip, string $range): bool
    {
        if (!str_contains($range, '/')) {
            return hash_equals($range, $ip);
        }
        [$network, $prefixText] = explode('/', $range, 2);
        $ipBytes = @inet_pton($ip);
        $networkBytes = @inet_pton($network);
        if ($ipBytes === false || $networkBytes === false || strlen($ipBytes) !== strlen($networkBytes)) {
            return false;
        }
        $prefix = filter_var($prefixText, FILTER_VALIDATE_INT);
        $maxBits = strlen($ipBytes) * 8;
        if (!is_int($prefix) || $prefix < 0 || $prefix > $maxBits) {
            return false;
        }
        $wholeBytes = intdiv($prefix, 8);
        $remainingBits = $prefix % 8;
        if (substr($ipBytes, 0, $wholeBytes) !== substr($networkBytes, 0, $wholeBytes)) {
            return false;
        }
        if ($remainingBits === 0) {
            return true;
        }
        $mask = (0xff << (8 - $remainingBits)) & 0xff;
        return (ord($ipBytes[$wholeBytes]) & $mask) === (ord($networkBytes[$wholeBytes]) & $mask);
    }
}
