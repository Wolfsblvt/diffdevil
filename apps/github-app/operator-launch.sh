#!/bin/bash -p
# SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
# Invoke with bash -p: privileged mode ignores BASH_ENV and imported shell functions.
set -eu
helper=${1-}
case "$helper" in operator|manifest) ;; *) printf '%s\n' 'Select operator or manifest.' >&2; exit 2;; esac
shift
directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
node_path=$(type -P node)
# Strip export attributes rather than passing credentials as env(1) arguments.
while IFS= read -r name; do export -n "$name"; done < <(compgen -e)
for name in PATH SYSTEMROOT WINDIR TEMP TMP TMPDIR HOME USERPROFILE HOMEDRIVE HOMEPATH APPDATA LOCALAPPDATA XDG_CONFIG_HOME WRANGLER_HOME; do
    if [[ ${!name+x} ]]; then export "$name"; fi
done
if [[ -n ${CLOUDFLARE_API_TOKEN-} ]]; then export CLOUDFLARE_API_TOKEN
else
    for name in CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL; do
        if [[ ${!name+x} ]]; then export "$name"; fi
    done
fi
arguments=("$@")
selected_names=()
for ((index=0; index<${#arguments[@]}; index++)); do
    case "${arguments[index]}" in
        --seal-key-env) slot=DIFFDEVIL_OPERATOR_SEAL_INPUT;;
        --wirt-signing-key-env) slot=DIFFDEVIL_OPERATOR_WIRT_INPUT;;
        *) continue;;
    esac
    index=$((index+1))
    name=${arguments[index]-}
    if [[ ! $name =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then printf '%s\n' 'Invalid named input.' >&2; exit 2; fi
    for previous in "${selected_names[@]}"; do
        if [[ $previous == "$name" ]]; then printf '%s\n' 'Each protected input must use a distinct named variable.' >&2; exit 2; fi
    done
    selected_names+=("$name")
    if [[ ${!name+x} ]]; then
        value=${!name}
        printf -v "$slot" '%s' "$value"
        export "$slot"
    else unset "$slot"
    fi
    arguments[index]=$slot
done
exec "$node_path" "$directory/$helper-helper.mjs" "${arguments[@]}"
