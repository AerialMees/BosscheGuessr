#!/bin/zsh
cd "$(dirname "$0")" || exit 1
npm run launch
echo
echo "BosscheGuessr stopped. You can close this window."
read -k 1 "?Press any key to close..."
