#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Requires diffdevil on PATH. Reads a saved report; never applies effects.
set -u
report=${1:-report.json}
limit=${2:-100}
if ! command -v diffdevil >/dev/null 2>&1; then
  printf '%s\n' 'diffdevil is not on PATH.' >&2; exit 2
fi
work=$(mktemp -d) || exit 2
trap 'rm -rf -- "$work"' EXIT

changed=$(diffdevil query --report "$report" --metric changed --format value)
code=$?
if (( code != 0 )); then exit "$code"; fi
printf 'Changed: %s\n' "$changed"

diffdevil check --report "$report" --metric changed --lt "$limit" --format json > "$work/check.json"
decision=$?
case "$decision" in
  0) printf '%s\n' "Changed is below $limit." ;;
  1) printf '%s\n' "Changed is not below $limit." ;;
  *) exit "$decision" ;;
esac

# Check the producer's exit before reading its NUL-delimited result.
diffdevil query --report "$report" --files --select path --format nul --output "$work/paths"
code=$?
if (( code != 0 )); then exit "$code"; fi
while IFS= read -r -d '' path; do
  printf 'Path: %q\n' "$path"
done < "$work/paths"
exit "$decision"
