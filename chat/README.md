# Hanazar Chat

Private PHP 8.2 and SQLite chat service for `chat.hanazargames.com`. It is intentionally separate from the static GitHub Pages site because Pages cannot execute PHP.

## Deploy

1. Install PHP 8.2+, Composer, Nginx, and PHP-FPM on the Chat server.
2. Place the release at `/srv/hanazar-chat/current` and create shared `data`, `sessions`, `logs`, `rate-limits`, and `backups` directories with mode `0700`.
3. Copy `.env.example` to `/srv/hanazar-chat/shared/chat.env`, replace the key with `base64_encode(random_bytes(32))`, and keep the file readable only by `hanazar-chat`.
4. Load the environment with `set -a && . /srv/hanazar-chat/shared/chat.env && set +a`, run `composer install --no-dev --classmap-authoritative`, then `php scripts/check.php`.
5. Install the supplied PHP-FPM pool, PHP-FPM systemd environment drop-in, Nginx site, and either the maintenance timer or cron configuration; then reload systemd and restart PHP-FPM/Nginx.
6. Load `chat.env` as above, then run `php scripts/create-admin.php USERNAME`; enter the password at the hidden prompt. For automation, pipe the secret through standard input instead of placing it in process arguments.

Run the application tests with `composer install && composer test` in an environment that has `pdo_sqlite`.
