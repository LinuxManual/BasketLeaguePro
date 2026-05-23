#!/usr/bin/env bash
set -euo pipefail

rm -rf _site docs
mkdir -p _site/data docs/data

cp index.html _site/index.html
cp 404.html _site/404.html
cp styles.css _site/styles.css
cp script.js _site/script.js
cp data/store.json _site/data/store.json

cp _site/index.html docs/index.html
cp _site/404.html docs/404.html
cp _site/styles.css docs/styles.css
cp _site/script.js docs/script.js
cp _site/data/store.json docs/data/store.json

# Disable Jekyll processing and ensure clean static serving.
: > docs/.nojekyll
: > _site/.nojekyll
