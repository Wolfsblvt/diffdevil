// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Test support: several PRs in one repository. One FakeGitHub per PR, an open-PR listing derived from them, and a
 * captured queue. It cannot make an external request. Comment IDs stay unique across PRs by seeding each PR with
 * another author's comment at a distinct base.
 */
import { FakeGitHub, json } from '../../src/diffdevil/tests/helpers/github.mjs';

export const SHARED = '@@ -1,3 +1,3 @@\n-one\n-two\n-three\n+four\n+five\n+six';

export class FakeRepository {
  pulls = new Map();
  definitions = new Map();
  add(number, { files = [{ filename: 'src/main.ts', status: 'modified', additions: 3, deletions: 3, changes: 6, patch: SHARED }], title = `PR ${number}`, head } = {}) {
    const fake = new FakeGitHub();
    // Label definitions are repository-wide; each PR keeps its own assignments and comments.
    fake.definitions = this.definitions;
    fake.files = files; fake.title = title; fake.head = head ?? String(number % 10).repeat(40);
    fake.comments.push({ id: number * 1000, body: 'A human comment', user: { id: 5, login: 'someone', type: 'User' } });
    this.pulls.set(number, fake);
    return fake;
  }
  get author() { return [...this.pulls.values()][0].author; }
  owned(number) { return this.pulls.get(number).comments.filter(comment => comment.user.login === this.author.login); }
  writes() { return [...this.pulls.values()].flatMap(fake => fake.writes()); }
  /** The open listing in GitHub's shape: `sort=created` orders by number; `updated` keeps insertion order. Paged with Link headers. */
  listing(url) {
    const open = [...this.pulls].filter(([, fake]) => fake.state === 'open').map(([number, fake]) => ({ number, title: fake.title, draft: false, head: { sha: fake.head },
      html_url: `https://github.com/example/repository/pull/${number}` }));
    if (url.searchParams.get('sort') === 'created') open.sort((a, b) => a.number - b.number);
    if (url.searchParams.get('sort') === 'created' && url.searchParams.get('direction') === 'desc') open.reverse();
    return [...this.pulls.values()][0].page(open, url);
  }
  fetch = async (input, init = {}) => {
    const url = new URL(String(input)), path = url.pathname, method = init.method ?? 'GET';
    if (path === '/repositories/17') return json({ id: 17, full_name: 'example/repository', default_branch: 'main' });
    if (path.startsWith('/repos/example/repository/check-runs')) return json({ id: 99 }, method === 'POST' ? 201 : 200);
    if (path === '/repos/example/repository/pulls' && method === 'GET') return this.listing(url);
    const comment = /^\/repos\/example\/repository\/issues\/comments\/(\d+)$/u.exec(path);
    if (comment) { const owner = [...this.pulls.values()].find(fake => fake.comments.some(item => item.id === Number(comment[1]))); if (owner) return owner.fetch(input, init); }
    const scoped = /^\/repos\/example\/repository\/(pulls|issues)\/(\d+)(\/.*)?$/u.exec(path);
    if (scoped && this.pulls.has(Number(scoped[2]))) {
      const fake = this.pulls.get(Number(scoped[2]));
      const rewritten = new URL(url); rewritten.pathname = `/repos/example/repository/${scoped[1]}/42${scoped[3] ?? ''}`;
      const response = await fake.fetch(rewritten.href, init);
      if (scoped[1] !== 'pulls' || scoped[3] || new Headers(init.headers).get('accept') === 'application/vnd.github.diff') return response;
      // The pull itself names its own number.
      return json({ ...(await response.json()), number: Number(scoped[2]) }, response.status);
    }
    // Repository-level routes (label definitions, contents, branches) belong to the first PR's fake.
    return [...this.pulls.values()][0].fetch(input, init);
  };
}

export function captureQueue() { const sent = [], delays = []; return { sent, delays, async send(body, options) { sent.push(body); delays.push(options?.delaySeconds ?? 0); } }; }
