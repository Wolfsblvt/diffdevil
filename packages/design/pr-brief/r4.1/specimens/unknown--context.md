> [!NOTE]
> **Two open PRs touch the same files**
>
> **[#418 — Scope override precedence](#pr-418)** · open  
> Also changes `src/policy.ts` and `src/config.ts`.
>
> **[#427 — Validate inherited limits](#pr-427)** · draft  
> Also changes `src/policy.ts`.

**The most frequently changed files in this PR**

| File | Changed here | Last 90 days |
| :--- | ---: | :--- |
| `src/policy.ts` | unavailable | **18 merged PRs**<br>1.8× Turnover |
| `src/config.ts` | unavailable | **12 merged PRs**<br>0.8× Turnover |

*Turnover is change volume relative to file size. The repository had **40 merged PRs** in this period.*

**`tests/policy.test.ts` is unchanged here.** It accompanied `src/policy.ts` in **14 of 18 merged PRs** touching that file over the same 90 days.

### This change

**Size unresolved · 5 included files**

The file list is available; the diff data needed to measure Changed is unavailable.

Also included: `src/report.ts`, `tests/config.test.ts`, `docs/policy.md`.

`pnpm-lock.yaml` is excluded by repository policy.

<details>
<summary>Measurement and context details · c7a91e2</summary>

**Comparison:** `b406d85` → `c7a91e2`. Current comparison and open-PR file lists are from the same synthetic snapshot, 10 Oct 2026 at 02:20 UTC.

**Measurement:** Changed and raw churn are unavailable. Known file identities still support the independently available same-file and historical context.

**Repository policy:** `size@1` defines M as 100–499 included Changed. `pnpm-lock.yaml` is excluded. The evidence cannot establish one numeric band. The check reports the repository policy’s decision and current effect status.

**Included files**

| File | Changed |
| :--- | :--- |
| `src/policy.ts` | unavailable |
| `src/config.ts` | unavailable |
| `src/report.ts` | unavailable |
| `tests/config.test.ts` | unavailable |
| `docs/policy.md` | unavailable |

**Repository history:** 40 unique merged PRs in `example/relay`, 12 Jul–10 Oct 2026; 40 of 40 known final comparisons recovered. Same measurement version, effective policy and path exclusions. Median: **132 Changed**.

**File activity:** frequency counts distinct merged PRs. `src/policy.ts` appears in 18, `src/config.ts` in 12, `src/report.ts` in 5, `tests/config.test.ts` in 4, and `docs/policy.md` in 1. Each PR contributes one final recoverable comparison.

**Turnover:** `src/policy.ts`: 900 Changed / 500 time-weighted average lines = 1.8×. `src/config.ts`: 480 / 600 = 0.8×. File identities and size evidence cover the whole window. Neither file was created or deleted in the window. This is change volume relative to size, not unique lines rewritten.

**Historical companion:** `tests/policy.test.ts` appears with `src/policy.ts` in 14 of 18 merged PRs touching the anchor, and in 15 of all 40 repository merged PRs. The window and coverage are the same. The current file list is complete, so “unchanged here” is established.

**Current neighbours:** two authorised open PRs share the listed files. File sharing does not establish overlapping lines, a dependency or a predicted conflict. The historical companion describes observed co-change; it is not a test-coverage verdict.

[Full measurement and effect status in the check](#check) · [Explore this PR in the App](#app)

</details>
