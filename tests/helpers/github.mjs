// In-memory GitHub wire model. It cannot make an external request.
export const HEAD = 'a'.repeat(40), BASE = 'b'.repeat(40);
export const TARGET = Object.freeze({ repository: 'example/repository', pullRequest: 42 });
export const PATCH = '@@ -1,3 +1,3 @@\n-one\n-two\n-three\n+four\n+five\n+six';
export function json(value, status = 200, headers = {}) {
  return new Response(status === 204 ? null : JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
}
export class FakeGitHub {
  head = HEAD; base = BASE; defaultBranch = BASE; state = 'open'; count;
  files = [{ filename: 'src/main.ts', status: 'modified', additions: 3, deletions: 3, changes: 6, patch: PATCH }];
  rawDiff = '';
  definitions = new Map();
  labels = new Set();
  comments = [];
  contents = new Map();
  calls = [];
  author = { login: 'fixture-app[bot]', id: 101, type: 'Bot' };
  before;
  fetch = async (input, init = {}) => {
    const url = new URL(String(input)), method = init.method ?? 'GET';
    const path = url.pathname;
    const call = { path, method, query: url.search, accept: new Headers(init.headers).get('accept'), body: init.body === undefined ? undefined : JSON.parse(String(init.body)), headers: new Headers(init.headers) };
    this.calls.push(call);
    const override = await this.before?.(call, this);
    if (override) return override;
    const root = '/repos/example/repository';
    if (method === 'GET' && path === root) return json({ full_name: TARGET.repository, default_branch: 'main' });
    if (method === 'GET' && path === root + '/commits/main') return json({ sha: this.defaultBranch });
    if (!path.startsWith(root + '/')) return json({ message: 'missing repository' }, 404);
    const suffix = path.slice(root.length);
    if (method === 'GET' && suffix === '/pulls/42') {
      if (call.accept === 'application/vnd.github.diff') return new Response(this.rawDiff);
      return json({ number: 42, state: this.state, head: { sha: this.head }, base: { sha: this.base, repo: { full_name: TARGET.repository } }, changed_files: this.count ?? this.files.length });
    }
    if (method === 'GET' && suffix === '/pulls/42/files') return this.page(this.files.slice(0, 3000), url);
    if (method === 'GET' && suffix.startsWith('/contents/')) {
      const key = url.searchParams.get('ref') + ':' + decodeURIComponent(suffix.slice(10));
      const value = this.contents.get(key);
      if (value === undefined) return json({ message: 'missing content' }, 404);
      return json(typeof value === 'string' ? { type: 'file', sha: 'c'.repeat(40), size: Buffer.byteLength(value), encoding: 'base64', content: Buffer.from(value).toString('base64') } : value);
    }
    if (suffix === '/labels') {
      if (method === 'GET') return this.page([...this.definitions.values()], url);
      if (method === 'POST') {
        const key = call.body.name.toLowerCase();
        if (this.definitions.has(key)) return json({ message: 'already exists' }, 422);
        const label = { ...call.body, archived: false };
        this.definitions.set(key, label); return json(label, 201);
      }
    }
    if (suffix.startsWith('/labels/')) {
      const key = decodeURIComponent(suffix.slice(8)).toLowerCase(), label = this.definitions.get(key);
      if (!label) return json({ message: 'missing label' }, 404);
      if (method === 'GET') return json(label);
      if (method === 'PATCH') { Object.assign(label, call.body); return json(label); }
    }
    if (suffix === '/issues/42/labels') {
      if (method === 'GET') return this.page([...this.labels].map(name => ({ name })), url);
      if (method === 'POST') {
        for (const name of call.body.labels) {
          const label = this.definitions.get(name.toLowerCase());
          if (!label || label.archived) return json({ message: 'label cannot be assigned' }, 422);
          this.labels.add(label.name);
        }
        return json([...this.labels].map(name => ({ name })));
      }
    }
    if (method === 'DELETE' && suffix.startsWith('/issues/42/labels/')) {
      const key = decodeURIComponent(suffix.slice('/issues/42/labels/'.length)).toLowerCase();
      const found = [...this.labels].find(name => name.toLowerCase() === key);
      if (!found) return json({ message: 'already absent' }, 404);
      this.labels.delete(found); return json([...this.labels].map(name => ({ name })));
    }
    if (suffix === '/issues/42/comments') {
      if (method === 'GET') return this.page(this.comments, url);
      if (method === 'POST') {
        const comment = { id: this.comments.reduce((m, item) => Math.max(m, item.id), 0) + 1, body: call.body.body, user: this.author };
        this.comments.push(comment); return json(comment, 201);
      }
    }
    if (suffix.startsWith('/issues/comments/')) {
      const id = Number(suffix.slice('/issues/comments/'.length)), item = this.comments.find(comment => comment.id === id);
      if (!item) return json({ message: 'missing comment' }, 404);
      if (method === 'GET') return json(item);
      if (method === 'PATCH') { item.body = call.body.body; return json(item); }
    }
    return json({ message: 'unimplemented fake route' }, 404);
  };
  page(items, url) {
    const page = Number(url.searchParams.get('page') ?? 1), size = Number(url.searchParams.get('per_page') ?? 100);
    const start = (page - 1) * size;
    const next = new URL(url); next.searchParams.set('page', String(page + 1));
    return json(items.slice(start, start + size), 200, start + size < items.length ? { link: `<${next}>; rel="next"` } : {});
  }
  writes() { return this.calls.filter(call => call.method !== 'GET'); }
}
