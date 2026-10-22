// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Shared bucket identity for the common History charts and its premium regions. */
import { fromRetained, changeVolume, bucketsFor } from './derive.mjs';
import { fmtDate, fmtMonth, fmtMonthLong } from './format.mjs';
import { pullRequestPath } from './scope.mjs';
export function historySelection(view) {
  const { state, lifecycle } = view;
  const life = lifecycle.standing === 'available';
  const DAY = 86_400_000;
  const serviceBuckets = life ? (view.data?.result?.buckets ?? []) : [];
  const unitOf = (bucket) => { const days = Math.round((Date.parse(bucket.to) - Date.parse(bucket.from)) / DAY); return days <= 1 ? 'day' : days === 2 ? '2 days' : days <= 7 ? 'week' : 'month'; };
  const repositoryName = (pr) => view.viewer.repositories.find((repository) => repository.repositoryId === pr.repositoryId)?.fullName ?? '';
  const prHref = (pr) => view.href(pullRequestPath(repositoryName(pr), pr.number));
  // Buckets on the retained basis come from the service (merged pull requests by merge time, current-policy composition); otherwise calendar buckets over the pathless analyses.
  const retainedList = serviceBuckets.map((bucket, index) => {
    const members = (bucket.pullRequests ?? []).map((row) => view.pullRequests.get(`${row.repositoryId}#${row.pullRequest}`) ?? fromRetained(row));
    const recovered = members.filter((pr) => !pr.unrecovered);
    const boundedOnes = recovered.filter((pr) => pr.latest.changed.status !== 'exact');
    return { index, start: bucket.from, end: bucket.to, unit: unitOf(bucket), count: members.length, recovered: recovered.length, coverage: members.length > recovered.length ? 'partial' : 'complete',
      added: bucket.composition?.addedOnly?.lower ?? 0, deleted: bucket.composition?.deletedOnly?.lower ?? 0, modified: bucket.composition?.modified?.lower ?? 0,
      boundedLow: boundedOnes.reduce((total, pr) => total + (pr.latest.changed.lower ?? 0), 0), boundedHigh: boundedOnes.every((pr) => pr.latest.changed.upper !== null) ? boundedOnes.reduce((total, pr) => total + pr.latest.changed.upper, 0) : null, boundedCount: boundedOnes.length,
      rawChurn: bucket.rawChurn?.lower ?? 0, covered: bucket.coverage?.completeWindow !== false,
      evidence: { changed: bucket.changed, rawChurn: bucket.rawChurn, modified: bucket.composition?.modified, added: bucket.composition?.addedOnly, deleted: bucket.composition?.deletedOnly }, members };
  });
  const pathless = life ? null : changeVolume({ buckets: bucketsFor(view.period.key, view.nowIso, view.bounds.first).list, pullRequests: view.pullRequests, lifecycle });
  const list = life ? retainedList : pathless.list;
  const unit = list[0]?.unit ?? 'bucket';
  const note = !life ? bucketsFor(view.period.key, view.nowIso, view.bounds.first).note : undefined;
  const lastWithContent = list.map((bucket, index) => bucket.count ? index : -1).filter((index) => index >= 0).pop();
  const selected = list.length ? (state.w !== '' ? Math.max(0, Math.min(list.length - 1, Number(state.w))) : (lastWithContent ?? list.length - 1)) : null;
  const bucket = selected === null ? null : list[selected];
  const labelOf = (item) => item.unit === 'month' ? fmtMonth(item.start) : fmtDate(item.start);
  const nameOf = (item) => item.unit === 'week' ? `Week of ${fmtDate(item.start)}` : item.unit === 'month' ? fmtMonthLong(item.start) : item.unit === '2 days' ? `${fmtDate(item.start)} – ${fmtDate(new Date(Date.parse(item.end) - 1).toISOString())}` : fmtDate(item.start);
  const unitWord = unit === '2 days' ? 'bucket' : unit;
  return { list, unit, note, selected, bucket, labelOf, nameOf, unitWord, repositoryName, prHref };
}
