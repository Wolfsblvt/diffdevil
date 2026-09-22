# Playground

Use the [Playground](https://diffdevil.dev/playground/) to understand a real public change and try policy before installing anything. It is read-only: configuration and GitHub previews do not apply labels, post comments or enable an App.

## Choose a frozen example or a live comparison

For a repeatable first result, open [the lockfile example without its lockfile](https://diffdevil.dev/playground/?example=lockfile-scope&variant=without-lockfile). The URL selects both a lesson and a source/policy variant. A retained real-PR edition has exact revisions, capture and engine information, and provenance. It does not silently change when the upstream PR moves.

The [Examples catalogue](https://diffdevil.dev/examples/) contains seven complementary lessons: lockfiles, null guards, formatter/snapshot changes, binary material, distribution across files, bounded decisions and incomplete file sets. Their short guides live with the selected Playground result. They are not seven unrelated calculators or copied manual chapters.

For live acquisition, enter a public `https://github.com/OWNER/REPO/pull/NUMBER` URL. The browser calls the configured public acquisition API and evaluates the returned report. Live input starts with the explicit size preset; it does not automatically inherit private App settings or turn proposed PR-head policy into trusted configuration.

No account or token is required. Private PRs, Enterprise URLs and arbitrary fetch targets are outside this route. A repository visible through your signed-in GitHub tab is not necessarily public. The website and acquisition service must actually be reachable for live use; a local static build does not establish a deployed backend.

## Read the source edition before the number

Inspect whether the result is a retained snapshot or a newly acquired PR. Keep the reported base/head, source edition, policy and evidence together. Changing a setting evaluates the already acquired comparison locally; it does not fetch newer code just to adjust a threshold.

The lockfile variants illustrate the consequence. The retained all-files view gives 22 Changed and 25 raw churn. Excluding the lockfile gives 1 Changed and 2 raw churn. That is a narrower included question over the same source, not a claim that the other changes disappeared. [Evidence and uncertainty](../understand/evidence-and-uncertainty.md) explains why some views retain bounds or incomplete membership.

## Start with controls; use policy for depth

Controls expose the preset, measurement, available band thresholds and label mappings, exclusions and an optional comment preview. Adjust one setting, then inspect the new result. Exclusion annotations help show which observed paths match.

The Policy editor contains ordinary `.diffdevil.yml`, not a second website language. Form controls and the editor use the same compiler. Configuration that the controls cannot represent remains visible as preserved advanced content; switching views must not silently discard it. A custom formula can therefore remain an expression rather than being replaced with a nearby simple metric.

Invalid YAML, an invalid declaration or incompatible policy is a configuration failure. The editor preserves your input and can show the previous valid result with that standing clearly marked. A previous result is not evidence that the current invalid edit worked. Repair the reported source location, or deliberately restore a known policy.

## Four views of one result

| View | What it is for |
| --- | --- |
| Terminal | The shared human report, including Changed, decomposition and evidence |
| Agent | A compact readable projection for an agent or reviewer |
| GitHub preview | Desired labels and optional comment presentation, not observed provider changes |
| Explanation | Policy origins, scopes, exclusions and the decisions behind the display |

Switching tabs changes presentation, not the source comparison. Unknown or unmeasurable values do not become exact because a different view has a simpler layout. The [facts-to-provider-state model](../understand/facts-to-provider-state.md) applies here too: a useful desired preview is still not an applied effect or a current native check.

## Export the right thing

Open Export and choose the consumer. The CLI tab replays a saved report: first save `report.json` from the data tab, and save the current `.diffdevil.yml` when the example uses custom policy. Its commands analyze, query and plan that captured comparison; they do not acquire a new live head. An exact scalar query can still exit 3 for a bounded result.

The data tab offers the canonical report and, when available, a desired plan. Agent text is not a substitute for either JSON artifact. The policy tab carries reusable configuration; [Reports, plans, and apply](shared-workflows/reports-plans-and-apply.md) explains the validation and trust required when moving those files elsewhere.

The Action step tab is a starter excerpt. In particular, the applying step by itself does not embed your custom editor policy. For that policy, use the complete workflow together with `.diffdevil.yml`, and make the policy available at the selected trusted base. Read the export's permissions and read/write note before adoption. Running an exported workflow measures its own current event, not the frozen report shown in your browser.

An App adoption link can carry the policy toward a different product surface. It does not install, authenticate, enable effects or consent to history. Managed operation retains its own [availability and setup boundary](managed-app/README.md).

## Refresh explicitly

Switching a catalogue example to live analysis is a new source edition. A newer-head indication offers a deliberate refresh rather than combining fresh paths with old counts. Keep a useful report export when you need to compare before and after.

Cancellation and superseding an in-flight request are not provider errors. A late completion cannot replace the result for a different selected input. After a failed request, inspect the retained result's source and standing; do not assume it describes the URL you most recently attempted.

## Privacy, limits and recovery

The live route sends the public PR URL to the acquisition service, which reads public GitHub data. The interface has no private-token input or raw-diff upload control. Policy evaluation is local, but edited policy is encoded into the shareable page URL. Base64url is not encryption: the URL can enter browser history, copied links, screenshots and infrastructure logs. Do not put secrets or private repository configuration in a public Playground URL.

The source has no permanent visitor-history feature. Full reports and source data can remain in active memory and deliberate exports. Browser and network infrastructure have their own handling; the [product data contract](../../PRIVACY-AND-DATA.md#public-playground) is not a claim that no network request exists.

Invalid URLs fail before acquisition. An inaccessible/private PR, rate limit, unavailable service, changed revision, invalid report or size ceiling has a distinct failure. Honor a supplied retry delay; repeated reloads consume the same shared upstream budget. Frozen examples remain a useful alternative when GitHub is unavailable. A result ceiling must not silently turn a prefix into a complete file list.

For a reproducible problem report, include the public example and variant, source edition, policy without secrets and displayed diagnostic. [Try a public pull request](../start/try-a-public-pull-request.md) provides the first-use journey; the [shared catalogue contract](../../integration/example-catalogue.md) explains retained editions and provenance.
