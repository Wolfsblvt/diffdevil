# Install the diffdevil skill

Install the official diffdevil skill and its references for this agent, using
personal scope unless the user's specific or global instructions select otherwise.
Use the actual harness's native installer or documented persistent skill location.

Read and carry the canonical installation and update procedure included in the
released Skill folder. It owns source selection, complete-folder acquisition,
existing installations, updates, offline behavior, and host suggestions.

Read the stable release manifest at
`https://github.com/Wolfsblvt/diffdevil/releases/latest/download/diffdevil-release-manifest.json`,
then obtain the complete archive named by `assets.skill` and verify its SHA-256
before extracting it. Confirm that `SKILL.md` metadata matches
`skills.diffdevil.version` and that the canonical Skill tree, excluding its
generated `MANIFEST.json`, matches the declared digest.
Copy all canonical files without rewriting them for this harness.
The useful core and its deeper Markdown references are one skill.

If that manifest is not published yet, do not call a mutable source checkout a
stable release. For a requested development installation, resolve repository
`main` once to a full commit, obtain the complete `skills/diffdevil/` folder from
that commit, and report that exact development coordinate. Otherwise report that
the stable carrier is not yet available rather than constructing an archive URL.

Reuse existing setup and the user's instructions. A repository being open does
not itself select repository scope. A custom copy, managed plugin, unavailable
persistent path, or required host reload is a specific installation condition to
resolve, not a reason to invent a different skill.

Confirm that the host can discover the skill and load its core and a reference.
Then report the installed skill version, actual scope/location, and CLI standing.
When command execution and the runtime are available, establish the executable
route using `diffdevil --version` or the npm route documented in the core.

This task installs tool knowledge. It does not by itself configure a repository
workflow, change policy, register an App, or apply GitHub labels/comments.
Those remain available when included in the user's request, including an existing
standing grant. Under an Everything setup, finish this installation step and
return to that broader setup's remaining work.
