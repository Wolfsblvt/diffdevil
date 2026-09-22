# Changed lines and raw churn

**Changed** counts added-only, deleted-only, and modified line positions.
**Raw churn** counts every addition and deletion. Both describe the selected diff;
neither is a judgment about the work.

## Count a replacement once

The complete [three-line replacement patch](../../examples/diffs/replacement.diff)
contains one edit block with three deletions followed by three additions. It has
**3 modified, 0 added-only, and 0 deleted-only lines**: 3 Changed, alongside 6 raw
churn.

From a [built source checkout](../start/analyze-local-changes.md#install-the-executable),
run the checked executable against the complete local example:

```sh
node dist/lib/cli/main.js analyze --diff-file docs/examples/diffs/replacement.diff --no-config --preset size@1 --format human --color never
```

The patch contains no contextual line between the deletions and additions, so
they belong to one contiguous edit block. “Modified” is this positional counting
rule. It does not claim a semantic correspondence between particular old and new
text.

## Keep the components separate

For one edit block with `A` raw additions and `D` raw deletions:

```text
Modified     = min(A, D)
Added only   = A - Modified
Deleted only = D - Modified
Changed      = Added only + Deleted only + Modified
Raw churn    = A + D
```

Two removed lines followed by three added lines therefore contribute 2 modified
and 1 added-only line: **3 Changed / 5 churn**. A pure addition contributes only
added-only lines; a pure deletion contributes only deleted-only lines.

Apply this calculation **per edit block**, then sum it. A context line, hunk
boundary, or file boundary ends a block. Taking `max(total additions, total
deletions)` for an entire file can incorrectly pair unrelated edits. Moving text
between separated locations is not automatically discounted as one replacement.

For applicable text measurements, the standard relationships remain:

```text
Raw additions = Added only + Modified
Raw deletions = Deleted only + Modified
Raw churn     = Changed + Modified
```

These relationships are part of the measurement model, not a second weighting
formula selected by the UI.

## Account for the complete small example

The [payments review patch](../../examples/diffs/review.diff) is the same complete
input used by the local quickstart. With no exclusions, its accounting is:

| File | Added only | Deleted only | Modified | Changed | Raw churn |
| --- | ---: | ---: | ---: | ---: | ---: |
| `src/payments.ts` | 1 | 0 | 2 | 3 | 5 |
| `tests/payments.test.ts` | 2 | 0 | 0 | 2 | 2 |
| `docs/payments.md` | 1 | 0 | 0 | 1 | 1 |
| `package-lock.json` | 0 | 0 | 4 | 4 | 8 |
| **Total** | **4** | **0** | **6** | **10** | **16** |

The shared presenter generates this result from that patch during the manual
build:

<!-- manual:generated presenter-small -->

The four-line lockfile replacement contributes four Changed even though most of
its text looks similar. The supplied diff presents all four lines as replaced;
the engine measures that diff, not an imagined better patch.

## Observed files and included totals

An explicit path policy can exclude the lockfile from the measured population.
The observed comparison still contains four files. Three are then included and
one excluded; their included totals are **6 Changed / 8 churn**:

```sh
node dist/lib/cli/main.js analyze --diff-file docs/examples/diffs/review.diff --no-config --preset size@1 --exclude package-lock.json --format human --color never
```

Exclusion does not delete the file's observed record or claim that the PR itself
became smaller. Inspect the selected population before comparing totals from two
reports. [Paths and scopes](../policy/paths-and-scopes.md) is the next-depth guide;
[the real lockfile lesson](https://diffdevil.dev/playground/?example=lockfile-scope&variant=without-lockfile)
lets you inspect the same distinction on a frozen public PR.

## The same total can have a different distribution

Ten Changed in one file and ten Changed spread across ten files share a line
total, not a file distribution. Keep file counts and scopes beside the total when
that distinction matters. The
[similar-size, different-spread lesson](https://diffdevil.dev/playground/?example=similar-size-different-spread&variant=many-small)
compares real source editions without turning spread into a risk score.

Missing patch blocks can leave Changed bounded even when raw additions and
deletions are exact. Binary material can be unmeasurable in lines. Do not apply
the exact formulas to missing evidence as though it were zero; continue with
[Evidence and uncertainty](evidence-and-uncertainty.md).

For command and output details, use the
[CLI reference](../reference/cli.md). The separate larger presenter fixture is
178 Changed; it is not another expected output for this 10-Changed patch.
