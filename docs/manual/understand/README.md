# How diffdevil reasons

diffdevil starts with a comparison, not a verdict. It records what changed, keeps the limits of that evidence visible, and evaluates the question your policy asks. A host may then use the result to change provider state. Those steps share data, but they are not interchangeable.

Consider the [small teaching patch](../../examples/diffs/review.diff). Its four files contain **10 Changed lines and 16 raw churn**. The default `size@1` policy classifies the included Changed count as `xs`. A plan can therefore desire `size/XS`. None of those facts establishes that GitHub has that label.

## Start with the comparison

A worktree report compares the tracked working tree with `HEAD`. A staged report compares the index with `HEAD`. A branch report normally compares a head with its merge base. A GitHub report names the pull request and the revisions acquired from the provider.

These are different questions even inside the same repository. Before comparing numbers, compare the source, revision identities, comparison mode, selected paths, policy and semantic versions. A familiar PR number is not enough to identify an immutable result.

A report also records file-set completeness. Knowing that more files exist does not supply their paths or measurements. Missing material remains missing rather than being filled with zeroes.

## Measure the material you actually have

[Changed lines](changed-lines-and-churn.md) count a replacement once within its edit block. Raw churn counts both the addition and deletion sides. Both are useful; neither counts importance or predicts review effort.

A value can be exact, bounded, unknown or unmeasurable. That standing belongs to the particular value. An exact raw count does not make the corresponding Changed count exact when edit-block evidence is absent. A known file path does not make its binary contents line-measurable.

[Evidence and uncertainty](evidence-and-uncertainty.md) explains what each state establishes and how it follows a result into checks, bands and scripts.

## Ask a deliberate policy question

Policy selects paths and scopes, derives metrics, classifies values with bands, and evaluates rules. It does not alter what the source comparison originally contained.

Excluding `package-lock.json` from the teaching patch changes the included result to **6 Changed / 8 churn**. The four observed file records remain available, with one excluded. That is a narrower policy question, not a discovery that the lockfile never changed.

The preset gives a useful answer without custom expressions. A query asks for a value; a check asks whether a condition is established. A band can resolve from bounds when every possible value belongs to the same band. Conversely, an unresolved check is not false. An invalid policy is an error, not permission to silently use the default.

Use [Start with a preset](../policy/README.md) and [From measurements to rules](../policy/from-measurements-to-rules/README.md) when you are ready to author that question.

## Keep intent separate from observation

The output of a rule can be a desired effect: select a label, ensure its definition, or maintain an explicitly configured comment. That intent forms a **plan**. Planning neither requires nor proves a provider write.

An applying host must establish the target, trusted policy, current source and authority to perform the operation. Its result distinguishes requests from readback. A matching label can be a verified successful no-op. An acknowledged request can still have unobserved state. A partially completed operation sequence is not an atomic transaction that can be retried blindly.

[From facts to provider state](facts-to-provider-state.md) follows those stages with an executable plan and a held-decision specimen. [Source identity, trust, and mutation](trust-and-mutation.md) explains why a valid saved result is not automatically fresh, trusted or authorized for application.

## Choose the next explanation by the confusing result

| What you are trying to understand | Read next |
| --- | --- |
| Why Changed differs from the additions/deletions on GitHub | [Changed lines and raw churn](changed-lines-and-churn.md) |
| Why a number is a range, a check is unresolved, or a path list is incomplete | [Evidence and uncertainty](evidence-and-uncertainty.md) |
| Why a valid plan did not result in a label, or why a no-op is success | [From facts to provider state](facts-to-provider-state.md) |
| Why a report or policy cannot safely be used to write now | [Source identity, trust, and mutation](trust-and-mutation.md) |

For a first command rather than a concept, return to [Analyze local changes](../start/analyze-local-changes.md). For an automated consumer, [Use results in scripts](../start/use-results-in-scripts.md) keeps process success, the semantic answer and strict-output refusal separate.
