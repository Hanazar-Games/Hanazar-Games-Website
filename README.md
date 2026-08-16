# Hanazar-Games-Website
Official website for Hanazar Games.

## GitHub Pages

Pushes to `main` deploy the static export through `.github/workflows/deploy-pages.yml`.
Set the repository Pages source to **GitHub Actions**; the workflow applies the repository base path automatically.

Before the first deployment, open **Settings → Pages** and select **GitHub Actions** as the source. The workflow's built-in token cannot enable Pages for a repository where Pages is still disabled. For a private organization repository, also confirm that the organization plan and repository policy allow GitHub Pages.

## Public service backend

The site includes a static AES-256-GCM temporary-share interface at `/chat/` and an anonymous feedback wall in `/skin-service/`. GitHub Pages cannot persist cross-device data, so the PHP API under `chat/` must be deployed separately with persistent SQLite storage.

Deploy `chat/` to a PHP 8.2 server behind a CDN/WAF with TLS and DNS, configure `SHARE_ORIGINS`, and enable the maintenance timers. Set its HTTPS origin as `NEXT_PUBLIC_CHAT_SERVICE_URL` in Vercel and as a GitHub Actions repository variable. The next frontend deployment enables encrypted shares and the feedback wall; without the variable, both interfaces remain available but clearly show that their persistent service is disabled.
