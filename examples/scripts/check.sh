#!/usr/bin/env bash
# Uses the proposed diffdevil CLI. False, unresolved, and invalid remain distinct.
set -u
if diffdevil check --files any --metric changed --gt 100; then
  printf '%s\n' 'At least one included file exceeds the threshold.'
else
  code=$?
  case "$code" in
    1) printf '%s\n' 'No included file exceeds the threshold.' ;;
    3) printf '%s\n' 'The comparison cannot establish the decision.' >&2; exit 3 ;;
    *) exit "$code" ;;
  esac
fi
