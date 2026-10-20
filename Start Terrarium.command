#!/bin/zsh
set -e
cd "$(dirname "$0")"

# Use an installed Node first, or the Codex desktop runtime on this Mac.
if command -v node >/dev/null 2>&1; then
  TERRARIUM_NODE="$(command -v node)"
else
  TERRARIUM_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi

if [ ! -x "$TERRARIUM_NODE" ]; then
  echo "Please install Node.js 22.12 or newer, then run npm install and npm run dev."
  read -r "?Press Return to close."
  exit 1
fi

if [ ! -f node_modules/vite/bin/vite.js ]; then
  echo "Dependencies are missing. Run npm install in this folder first."
  read -r "?Press Return to close."
  exit 1
fi

exec "$TERRARIUM_NODE" node_modules/vite/bin/vite.js --host 127.0.0.1 --open
