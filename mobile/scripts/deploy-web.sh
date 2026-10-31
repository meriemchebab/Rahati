#!/usr/bin/env bash
# Publishes the mentor demo to GitHub Pages (branch gh-pages of the fork):
#   https://fulldready.tech/Rahati/       showcase page (fake Android phone)
#   https://fulldready.tech/Rahati/app/   the Rahati web app shown inside it
# No other branch is touched. Only public values from .env (EXPO_PUBLIC_*) end up in the
# web build, exactly as any visitor's browser would download them.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$(mktemp -d)"
REMOTE="$(git -C "$ROOT" remote get-url origin)"

case "$REMOTE" in
  *yomidotk/Rahati*) ;;
  *) echo "Refusing to publish: origin is $REMOTE, expected the yomidotk/Rahati fork." >&2; exit 1 ;;
esac

echo "Building the web app under /Rahati/app ..."
(cd "$ROOT" && EXPO_WEB_BASE_URL=Rahati/app npx expo export -p web --output-dir "$SITE/app" >/dev/null)

echo "Adding the showcase page ..."
cp "$ROOT"/showcase/* "$SITE/"
cp "$SITE/app/index.html" "$SITE/404.html"   # deep links (e.g. /Rahati/app/stats) load the app
touch "$SITE/.nojekyll"                      # let GitHub serve the _expo folder

echo "Publishing to gh-pages ..."
cd "$SITE"
git init -q -b gh-pages
git config user.name "$(git -C "$ROOT" config user.name)"
git config user.email "$(git -C "$ROOT" config user.email)"
git add -A
git commit -q -m "Publish web demo"
git push -q --force "$REMOTE" gh-pages
echo "Done. Published $(git rev-parse --short HEAD) to gh-pages."
