# Restricted and Web harnesses

## Meaning

This reference covers using the same diffdevil skill when a hosted execution
environment has Node.js or Git but cannot reach the npm registry, or does not
expose the user's persistent skill store. It separates acquisition, execution,
and installation so a failed route does not become a smaller tool.

## Establish what is available

Check the actual command runtime, existing diffdevil installation, mounted input,
and network route. A working browser or GitHub connector does not establish that
the shell has outbound registry access. An npm DNS error describes acquisition;
it does not establish that Node cannot execute supplied code.

Use the existing CLI or ordinary npm route when it works. Where acquisition is
restricted, an uploaded or mounted complete npm installation/runtime can supply
the same tool. Check its package identity, declared entry point, dependencies,
and supplied provenance rather than treating an arbitrary file as diffdevil.

For a full installed npm package with its dependencies present, the package's
current CLI entry can be exercised directly:

```sh
node /path/to/package/dist/lib/cli/main.js --version
node /path/to/package/dist/lib/cli/main.js analyze --cwd /path/to/mounted/repository --format agent
```

Those are example paths to replace with the actual supplied package and input.
A source archive without built output or dependency closure is not that complete
installation. Follow its documented build route only when the necessary runtime
and dependencies are actually available.

When a release has published the carriers, obtain the stable manifest from:

```text
https://github.com/Wolfsblvt/diffdevil/releases/latest/download/diffdevil-release-manifest.json
```

`assets.standalone` names the install-free Node 22+ CLI ZIP;
`assets.bundled` names the same runtime together with the complete Skill. Verify
the selected archive against its manifest SHA-256 before extracting it into a
clean directory. Both carriers expose `scripts/run.mjs`:

```sh
node /path/to/extracted/scripts/run.mjs --version
node /path/to/extracted/scripts/run.mjs analyze --cwd /path/to/mounted/repository --format agent
```

Their internal manifests bind the source commit, product version, file hashes,
and dependency closure. The bundled carrier additionally binds Skill SemVer.
The top-level release manifest records the archive's compressed/uncompressed
size, member count, largest members, executable/native extensions, and major
dependency contributors so a constrained harness can judge the real extraction
cost before downloading it.

## Use the real supplied capability

Once the CLI is available, use the ordinary sources, queries, policy, and output
formats from the other references. Local analysis sees only files and Git objects
actually present in the harness. A repository URL visible through a connector is
not automatically a local checkout.

A supplied shared-engine module may permit direct API analysis even when the
complete CLI is unavailable. Report that narrower execution fact accurately,
then use or obtain the full CLI when its commands are the requested result.
Engine/API execution alone does not prove query, policy, or CLI launcher behavior.

GitHub acquisition and application additionally need their actual network and
credential routes. An adequate user grant still applies; shell egress failure
neither supplies credentials nor globally makes the skill read-only.

## Keep persistence distinct

Loading this core and references into the current conversation is useful.
Writing the folder into a disposable execution sandbox is not necessarily
personal installation in the user's harness. Use an exposed native personal
installation route or the actual persistent skill directory when available.

A successful local CLI run does not establish persistent skill discovery.
Conversely, an installed Markdown skill can remain useful while the runtime
acquisition route is unavailable. Report the exact established result and the
remaining acquisition or installation step, not a universal host limitation.
