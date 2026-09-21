// SPDX-License-Identifier: AGPL-3.0-only
/**
 * One static JSON document per selected catalogue variant. The playground island
 * evaluates its selected policy locally through the shared engine; the retained
 * report and provenance come from the catalogue's exact source edition.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { catalogue } from '../../../lib/catalogue';
import { readRepositoryFile } from '../../../lib/engine-node';

export const getStaticPaths: GetStaticPaths = () => catalogue().variants.map(variant => ({ params: { id: variant.key } }));

/** The owned-comment preview every example can show when its own policy posts no comment. */
const PREVIEW_COMMENT_POLICY = 'docs/examples/policies/review-comment.yml';
const commentPolicyFor = (path: string = PREVIEW_COMMENT_POLICY) => ({ path, name: path.split('/').pop(), text: readRepositoryFile(path) });

export const GET: APIRoute = ({ params }) => {
  const variant = catalogue().findVariantByKey(params.id ?? '');
  if (!variant) return new Response(null, { status: 404 });
  const payload = {
    kind: 'diffdevil.playground-example', schemaVersion: '1.0', group: 'catalogue',
    id: variant.entryId, variant: variant.id, key: variant.key, repository: variant.repository, pullRequest: variant.pullRequest, title: variant.title, url: variant.url,
    sourceId: variant.sourceId, edition: variant.edition, focus: 'review',
    snapshot: { head: variant.head, base: variant.mergeBase, analyzedAt: variant.capturedAt, engine: variant.engine, evidence: variant.report.measurement.status },
    policy: { kind: 'file', name: `${variant.policyId}.json`, text: variant.policyText },
    commentPolicy: commentPolicyFor(),
    report: variant.report,
  };
  return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
