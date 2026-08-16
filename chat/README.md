# Hanazar Chat and Encrypted Shares

PHP 8.2 and SQLite service for private member Chat, public end-to-end encrypted temporary shares, and the public feedback wall. It is intended for `chat.hanazargames.com` and must run separately from GitHub Pages because Pages cannot execute PHP or persist data.

The public frontend encrypts text and arbitrary attachment types with AES-256-GCM before upload. `POST /api/shares` stores only ciphertext and expiry metadata; `GET /api/shares/{token}` returns the ciphertext while valid. The 256-bit encryption key remains after `#key=` in the public URL and is never included in an HTTP request. The database stores only SHA-256 hashes of the 256-bit random share tokens.

The anonymous feedback API exposes `GET /api/feedbacks`, `POST /api/feedbacks`, and `PATCH /api/feedbacks/{id}`. New entries stay private for five minutes. The creating browser receives a random edit token, while SQLite stores only its SHA-256 hash; the original publication deadline is never extended by editing. Content is length checked, rendered as text by the website, deduplicated for 24 hours, and protected by application and Nginx rate limits.

## Deploy

1. Install PHP 8.2+, Composer, Nginx, and PHP-FPM on the Chat server.
2. Place the release at `/srv/hanazar-chat/current` and create shared `data`, `sessions`, `logs`, `rate-limits`, and `backups` directories with mode `0700`.
3. Copy `.env.example` to `/srv/hanazar-chat/shared/chat.env`, replace the key with `base64_encode(random_bytes(32))`, set `SHARE_ORIGINS` to the exact HTTPS origins allowed to use public share and feedback APIs, and keep the file readable only by `hanazar-chat`.
4. Load the environment with `set -a && . /srv/hanazar-chat/shared/chat.env && set +a`, run `composer install --no-dev --classmap-authoritative`, then `php scripts/check.php`.
5. Install the supplied PHP-FPM pool, PHP-FPM systemd environment drop-in, Nginx site, daily maintenance timer, and minute-level expiry timer. If cron is used instead, install `cron/chat`, which runs expiry cleanup every minute. Reload systemd and restart PHP-FPM/Nginx.
6. Load `chat.env` as above, then run `php scripts/create-admin.php USERNAME`; enter the password at the hidden prompt. For automation, pipe the secret through standard input instead of placing it in process arguments.
7. Provision the TLS certificate and DNS record, then verify the public HTTPS origin before exposing the service.
8. Set `NEXT_PUBLIC_CHAT_SERVICE_URL` to that HTTPS origin in Vercel and in the website repository's GitHub Actions variables, then redeploy the frontend. Invalid or non-HTTPS values keep share creation disabled with an explicit configuration notice.

Public share requests are limited to 12 MiB at Nginx/PHP and 8 MiB of encoded ciphertext in the application. The website currently limits original attachments to 5 MiB total and ten files. Reads are rejected at the exact expiry time; the browser clears decrypted data immediately, while the minute-level job physically deletes expired ciphertext.

The included Nginx and PHP-FPM configuration limits per-IP request rates and concurrent connections, rejects oversized or slow requests, caps worker lifetime, and suppresses version disclosure. These controls reduce abuse and small floods but cannot absorb a large distributed denial-of-service attack. Put the origin behind a CDN/WAF, allow origin traffic only from that proxy, configure `TRUSTED_PROXIES` to the exact proxy networks, and apply provider-side bot and rate-limit rules before publishing DNS.

Run the application tests with `composer install && composer test` in an environment that has `pdo_sqlite`.
