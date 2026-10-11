# diffdevil PR brief design reference

## Meaning

This is the maintained design source for the managed App's standard PR message, the ratified `pr-brief-r4.1` candidate: its content, reading order, native GitHub Markdown, state family and decision boundary. It owns what the comment says and in which order; the composer under `apps/shared/pr-brief/` and the premium provider under `premium/pr-brief/` implement it, and their tests hold the implementation to these specimens. It does not prove native GitHub rendering, actual writer behavior or live adoption, and its proposed numeric selection and control vocabulary are engineering inputs rather than owner-ratified settings.

## Standing

| Standing | Content |
| --- | --- |
| Ratified by Wolf (10 October 2026) | Useful information before plumbing; one top-level native `NOTE` for the lead same-file PR connection; selected file frequency with Turnover; an evidenced historical companion; the current-change core; one supporting details fold; the exact, bounded, partial and unknown state family. |
| Inherited contracts | Comments and history independently off by default; one owned upsert report; existing portable templates and owned-comment lifecycle; fact, policy and effect separation; audience-first privacy; no edits after close or merge. |
| Nyxara proposal, qualified in source | Selection gates, visible budgets, the 16 KiB body ceiling, standard-control vocabulary and the optional final-summary copy. [ERRATA](ERRATA.md) records where implementation changed them and why. |
| Not established here | GitHub desktop, narrow, zoom and assistive-technology behavior in a real PR; the live writer; Account/Manage control layout. |

## Files

| Path | What it is |
| --- | --- |
| [`r4.1/`](r4.1/README.md) | The returned 24-file candidate, preserved byte-for-byte and verifiable with `r4.1/SHA256SUMS`: the [handoff](r4.1/HANDOFF.md) (decisions, controls, lifecycle, data and privacy, the 16 acceptance cases), the standalone visual reference, the synthetic fixture and the 16 exact Markdown specimens. |
| [`ERRATA.md`](ERRATA.md) | Corrections the implementation applies to the preserved specimens and proposals, each with its reason. |

The preserved candidate is design evidence with its own provenance: Nyxara's design Return in the owning Company room, recovered from its integrity-checked source capsule (archive SHA-256 `87c149752df2cb30a59a66bfc837ef9998b03a42ac0c2341c11f116d147115fd`). Edit the maintained meaning here and in ERRATA rather than rewriting those bytes; a new ratified revision is a new sibling directory.

## How the implementation binds to it

- `apps/shared/pr-brief/fixture.mjs` turns `r4.1/fixture.json` into composer inputs and into provider-shaped evidence that the preview evaluates through the effective policy; `apps/shared/pr-brief/specimens.mjs` applies only the recorded errata to the preserved specimens.
- The Community suite (`apps/shared/pr-brief/pr-brief.test.mjs`) reproduces every basic, history, unavailable and final-summary specimen; the premium suite (`premium/tests/pr-brief.test.mjs`) reproduces every context specimen and the unchanged-old-comment body inside the stale-head specimen.
- The acceptance cases A01–A15 have executable counterparts across those suites, the engine's owned-comment tests and `apps/github-app/pr-brief.test.mjs`. A16, native GitHub presentation, is outside source evidence: `node tools/pr-brief-render.mjs --github` renders through GitHub's Markdown API for structural inspection, and a real PR remains the qualification surface.
