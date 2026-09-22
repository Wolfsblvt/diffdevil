// SPDX-License-Identifier: AGPL-3.0-only
/** Search kind is explicit metadata, not a repository-directory convention. */
export function searchKind(url, metadata = {}) {
 if (['SITE','DOCS','FAQ'].includes(metadata.kind)) return metadata.kind;
 const target = new URL(url,'https://diffdevil.dev');
 if (target.pathname === '/faq/' && target.hash) return 'FAQ';
 if (target.hostname === 'docs.diffdevil.dev' || /^\/docs(?:\/|$)/u.test(target.pathname)) return 'DOCS';
 return 'SITE';
}
