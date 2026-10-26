#!/usr/bin/env bash
# Builds the public GitHub Pages version of the site: the real landing page plus a read-only menu.
# Ordering, staff and admin need the restaurant's server, so they are left out of this build.
# Works on a copy of the committed files, so your working tree is never changed. Output: ./out
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$ROOT/.static-build"
rm -rf "$TMP" "$ROOT/out" && mkdir "$TMP"
cd "$ROOT"
git ls-files -z | xargs -0 cp --parents -t "$TMP"
cd "$TMP"
rm -rf app/api app/t app/s app/uploads app/order app/staff app/admin tests
cat > next.config.mjs <<'CFG'
/** Static export for GitHub Pages (menu preview only). */
export default { output: 'export', basePath: '/smash-d-burger', images: { unoptimized: true }, trailingSlash: false }
CFG
sed -i "s#url('/menu-photo.jpg')#url('/smash-d-burger/menu-photo.jpg')#g; s#url('/smashed-burger-hero.png')#url('/smash-d-burger/smashed-burger-hero.png')#g" app/globals.css
pnpm install --frozen-lockfile
NEXT_PUBLIC_STATIC_SITE=1 NEXT_PUBLIC_BASE_PATH=/smash-d-burger pnpm exec next build
cp -r out "$ROOT/out" && touch "$ROOT/out/.nojekyll"
cd "$ROOT" && rm -rf "$TMP"
echo "Static site ready in ./out"
