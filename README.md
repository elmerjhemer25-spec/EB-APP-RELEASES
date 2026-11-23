# EB APP DOWNLOAD CENTER

Owner: Elmer Buencibillo
Design: Black / charcoal / gray / white
Target hosting: Netlify
Planned APK storage: Cloudflare R2

## Local preview
Open `index.html` in a browser. For a local server, from this folder run:
`py -m http.server 8080`
Then visit `http://localhost:8080`.

## Netlify
This is a static starter site. The existing Netlify project `ebappdownloadcenter` is connected
to this repository for continuous deployment.

- Repository: `elmerjhemer25-spec/EB-APP-RELEASES`
- Production branch: `main`
- Base directory: project root
- Build command: none (static site)
- Publish directory: `.`
- Live URL: https://ebappdownloadcenter.netlify.app

Every push to `main` triggers an automatic production deployment. Build settings are also
declared in `netlify.toml`.

## Current limitations
- The public app catalog contains placeholders only.
- No real APK files, versions, sizes, release dates, hashes, or download counts are fabricated.
- The admin page is a UI scaffold, NOT a secure authenticated admin system.
- Upload, publish/unpublish, download tracking, and signed links are not functional yet.
- No R2 credentials or admin secrets are stored in this project.

## Required backend work before public APK downloads
1. Configure a private Cloudflare R2 bucket and a safe public download strategy.
2. Add Netlify Functions for authenticated admin actions and short-lived signed uploads/downloads.
3. Store all R2 credentials as Netlify server-side environment variables only.
4. Add real admin authentication and authorization.
5. Validate APK MIME/type, size, package identity, version/build, and calculate SHA-256 server-side.
6. Store release metadata and download events in a database or another durable trusted store.
7. Test permissions, upload limits, download URLs, and rollback before publishing.

Suggested environment variable NAMES (values must be entered privately in Netlify):
- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME
- R2_PUBLIC_BASE_URL (only if using a public custom domain)
- ADMIN_AUTH_SECRET (or configure a trusted auth provider)

Never place R2 access keys or admin secrets in browser JavaScript or committed source files.