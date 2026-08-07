# Hanazar Chat and Encrypted Shares

PHP 8.2 and SQLite service for private member Chat plus public, end-to-end encrypted temporary shares. It is intended for `chat.hanazargames.com` and must run separately from GitHub Pages because Pages cannot execute PHP or persist ciphertext.

The public frontend encrypts text and arbitrary attachment types with AES-256-GCM before upload. `POST /api/shares` stores only ciphertext and expiry metadata; `GET /api/shares/{token}` returns the ciphertext while valid. The 256-bit encryption key remains after `#key=` in the public URL and is never included in an HTTP request. The database stores only SHA-256 hashes of the 256-bit random share tokens.

## Deploy

1. Install PHP 8.2+, Composer, Nginx, and PHP-FPM on the Chat server.
2. Place the release at `/srv/hanazar-chat/current` and create shared `data`, `sessions`, `logs`, `rate-limits`, and `backups` directories with mode `0700`.
3. Copy `.env.example` to `/srv/hanazar-chat/shared/chat.env`, replace the key with `base64_encode(random_bytes(32))`, set `SHARE_ORIGINS` to the exact HTTPS frontend origins, and keep the file readable only by `hanazar-chat`.
4. Load the environment with `set -a && . /srv/hanazar-chat/shared/chat.env && set +a`, run `composer install --no-dev --classmap-authoritative`, then `php scripts/check.php`.
5. Install the supplied PHP-FPM pool, PHP-FPM systemd environment drop-in, Nginx site, daily maintenance timer, and minute-level expiry timer. If cron is used instead, install `cron/chat`, which runs expiry cleanup every minute. Reload systemd and restart PHP-FPM/Nginx.
6. Load `chat.env` as above, then run `php scripts/create-admin.php USERNAME`; enter the password at the hidden prompt. For automation, pipe the secret through standard input instead of placing it in process arguments.
7. Provision the TLS certificate and DNS record, then verify the public HTTPS origin before exposing the service.
8. Set `NEXT_PUBLIC_CHAT_SERVICE_URL` to that HTTPS origin in Vercel and in the website repository's GitHub Actions variables, then redeploy the frontend. Invalid or non-HTTPS values keep share creation disabled with an explicit configuration notice.

Public share requests are limited to 12 MiB at Nginx/PHP and 8 MiB of encoded ciphertext in the application. The website currently limits original attachments to 5 MiB total and ten files. Reads are rejected at the exact expiry time; the browser clears decrypted data immediately, while the minute-level job physically deletes expired ciphertext.

Run the application tests with `composer install && composer test` in an environment that has `pdo_sqlite`.
