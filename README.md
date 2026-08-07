# Hanazar-Games-Website
Official website for Hanazar Games.

## GitHub Pages

Pushes to `main` deploy the static export through `.github/workflows/deploy-pages.yml`.
Set the repository Pages source to **GitHub Actions**; the workflow applies the repository base path automatically.

Before the first deployment, open **Settings → Pages** and select **GitHub Actions** as the source. The workflow's built-in token cannot enable Pages for a repository where Pages is still disabled. For a private organization repository, also confirm that the organization plan and repository policy allow GitHub Pages.

## Encrypted share deployment

The homepage links to `/chat/`, a static AES-256-GCM temporary-share interface that works on GitHub Pages. GitHub Pages cannot persist cross-device ciphertext, so the PHP API under `chat/` must be deployed separately with persistent SQLite storage.

Deploy `chat/` to a PHP 8.2 server with TLS and DNS, configure `SHARE_ORIGINS`, and enable the minute-level expiry timer. Set its HTTPS origin as `NEXT_PUBLIC_CHAT_SERVICE_URL` in Vercel and as a GitHub Actions repository variable. The next frontend deployment enables encrypted share creation and links in the form `/chat/?share=<random-token>#key=<browser-only-key>`.
