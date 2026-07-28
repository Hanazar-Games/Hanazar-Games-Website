# Hanazar-Games-Website
Official website for Hanazar Games.

## GitHub Pages

Pushes to `main` deploy the static export through `.github/workflows/deploy-pages.yml`.
Set the repository Pages source to **GitHub Actions**; the workflow applies the repository base path automatically.

Before the first deployment, open **Settings → Pages** and select **GitHub Actions** as the source. The workflow's built-in token cannot enable Pages for a repository where Pages is still disabled. For a private organization repository, also confirm that the organization plan and repository policy allow GitHub Pages.
