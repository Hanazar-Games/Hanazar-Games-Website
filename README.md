# Hanazar-Games-Website
Official website for Hanazar Games.

## GitHub Pages

Pushes to `main` deploy the static export through `.github/workflows/deploy-pages.yml`.
Set the repository Pages source to **GitHub Actions**; the workflow applies the repository base path automatically.

Before the first deployment, open **Settings → Pages** and select **GitHub Actions** as the source. The workflow's built-in token cannot enable Pages for a repository where Pages is still disabled. For a private organization repository, also confirm that the organization plan and repository policy allow GitHub Pages.

## Chat deployment

The homepage always links to the internal `/chat/` status route, which works on both GitHub Pages and the main Vercel domain. GitHub Pages cannot execute the PHP application or persist its SQLite data.

Deploy `chat/` to a separate PHP 8.2 server with persistent storage, TLS, and DNS. After that service is reachable, set the HTTPS URL as `NEXT_PUBLIC_CHAT_SERVICE_URL` in Vercel and as a GitHub Actions repository variable. The next frontend deployment will expose the **Open Chat** button while retaining the internal status route as the stable public entry.
