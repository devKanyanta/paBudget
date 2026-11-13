#!/usr/bin/env bash
# Commits (and optionally pushes) the current work as YOU, using your own git identity.
# No co-author trailers are added, and any "Co-Authored-By:" lines are stripped.
#
# Usage:
#   scripts/commit-part.sh "feat(mobile): 0.6 Flutter skeleton"            # commit only
#   scripts/commit-part.sh --push "feat(mobile): 0.6 Flutter skeleton"     # commit and push
#   scripts/commit-part.sh --push < message.txt                            # message from stdin
#   scripts/commit-part.sh --dry-run "msg"                                 # show what would happen
set -euo pipefail

push=false
dry=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --push) push=true; shift ;;
    --dry-run) dry=true; shift ;;
    --) shift; break ;;
    -*) echo "Unknown option: $1" >&2; exit 2 ;;
    *) break ;;
  esac
done

if [[ $# -gt 0 ]]; then
  message="$*"
elif [[ ! -t 0 ]]; then
  message="$(cat)"
else
  echo "Provide a commit message as an argument or on stdin." >&2
  exit 2
fi

# Strip any co-author / generated-by trailers and trailing blank lines.
message="$(printf '%s\n' "$message" \
  | grep -viE '^(co-authored-by|generated with)[: ]' \
  | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}')"

if [[ -z "${message//[[:space:]]/}" ]]; then
  echo "Commit message is empty." >&2
  exit 2
fi

cd "$(git rev-parse --show-toplevel)"

name="$(git config user.name || true)"
email="$(git config user.email || true)"
if [[ -z "$name" || -z "$email" ]]; then
  echo "Set your identity first: git config user.name / user.email" >&2
  exit 1
fi

branch="$(git symbolic-ref --short HEAD)"
echo "Author : $name <$email>"
echo "Branch : $branch"
echo "Message:"
printf '%s\n' "$message" | sed 's/^/  /'

git add -A
if git diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi
git status --short

if $dry; then
  echo "[dry run] would commit$($push && echo ' and push')."
  git reset -q
  exit 0
fi

git commit -q -m "$message"
git log -1 --format='Committed %h by %an <%ae>'

if $push; then
  git push -u origin "$branch"
fi
