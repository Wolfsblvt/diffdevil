// SPDX-License-Identifier: AGPL-3.0-only
import { analyzeBrowserInput, comparisonKey, compileBrowserPolicy, formatReport, humanReport, measureBoundedFiles, readComparison, SEMANTICS, type BrowserComparison, type BrowserPolicy, type Diagnostic, type FileRecord, type HumanReportView, type Report } from '@wolfsblvt/diffdevil/browser';
import type { AnalysisCache, CacheKind, CacheScope } from './cache.js';
import { decorateView, isPaused, selectedPolicy } from '../shared/settings.js';
import type { Settings } from '../shared/catalogue.js';
import { ExtensionError } from '../shared/errors.js';
import { automaticRemaining, emptyCoverage, isDeclineReason, readCoverage, summarize, standing, topUpRemaining, type Coverage, type DeclineReason, type FileFact } from '../shared/coverage.js';
import type { AnalysisInput, Inventory, Lookup, MeasureVia, Packet, PacketFile, PolicySource } from '../shared/protocol.js';
/** Persisted report and what is known about how far it was measured. */
export interface StoredReport { report: Report; coverage: Coverage; at: number }
/** Trusted-base policy evidence. A template is its text, or null once the exact base was confirmed not to have it. */
export interface StoredPolicy extends PolicySource { templates?: Record<string, string | null> }
interface Pointer { comparison: BrowserComparison; at: number }
interface Evidence { policy: PolicySource; templates?: Record<string, string> }
interface Context { key: string; reportKey: string; evidence: Evidence; packet: Packet; view: HumanReportView; report: Report; coverage: Coverage; policy?: BrowserPolicy; errors: readonly Diagnostic[]; settings: Settings; files: Map<string, HumanReportView>; byPath: Map<string, FileRecord> }
export interface AnalysisDependencies {
  readonly cache: AnalysisCache; readonly engine: string;
  /** A failed rebuildable cache never cancels a valid analysis; the failure is only reported. */
  readonly cacheFailed?: (error: unknown) => void | Promise<void>;
  readonly remember?: (comparison: BrowserComparison, at: number) => void | Promise<void>;
  readonly now?: () => number;
}
const REPORT_SCHEMA = '1.0'; const MAXIMUM_CONTEXTS = 6; const MAXIMUM_CONCURRENT = 3; const FOCUSED_PROJECTIONS = 150;
const hex = (buffer: ArrayBuffer): string => Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
const sha256 = async (text: string): Promise<string> => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
const errorDiagnostic = (code: string, message: string): Diagnostic => ({ code, message, severity: 'error', phase: 'config' });
const measured = (file: FileRecord): boolean => file.family?.blocksComplete === true;
/** A file that is not text has no lines to measure whatever anyone asks, so it is the provider's decline by kind. */
const KIND_REASON: Readonly<Partial<Record<FileRecord['kind'], DeclineReason>>> = { binary: 'binary', submodule: 'submodule', unknown: 'omitted' };
const facts = (report: Report, coverage: Coverage): FileFact[] => report.files.map(file => { const declined = measured(file) ? undefined : coverage.declined[file.path] ?? KIND_REASON[file.kind]; return { path: file.path, measured: measured(file), ...(declined ? { declined } : {}) }; });
/**
 * Everything the worker knows how to do with a comparison. The persisted facts are the canonical
 * report, its coverage and the trusted policy evidence; contexts are only an accelerator that is
 * rebuilt, under the settings in force now, whenever it is missing.
 */
export class Analysis {
  private readonly contexts = new Map<string, Context>();
  private readonly running = new Map<string, Promise<Packet>>();
  private readonly chains = new Map<string, Promise<unknown>>();
  private ready?: Promise<void>;
  private readonly cache: AnalysisCache; private readonly engine: string; private readonly now: () => number;
  constructor(private readonly dependencies: AnalysisDependencies) { this.cache = dependencies.cache; this.engine = dependencies.engine; this.now = dependencies.now ?? Date.now; }
  /** What an entry made today means. A different engine or measurement semantics makes every report a miss. */
  get compat(): Readonly<Record<CacheKind, string>> { return { report: `report:${REPORT_SCHEMA}:${this.engine}:${SEMANTICS.replacementLines}`, policy: 'policy:1', pointer: 'pointer:1' }; }
  private reportKey = (comparison: BrowserComparison): string => `report:${comparisonKey(comparison)}`;
  private policyKey = (comparison: BrowserComparison): string => `policy:${comparison.host}/${comparison.repository.toLowerCase()}@${comparison.base}/.diffdevil.yml`;
  private pointerKey = (comparison: Pick<BrowserComparison, 'host' | 'repository' | 'pullRequest'>): string => `pointer:${comparison.host}/${comparison.repository.toLowerCase()}#${comparison.pullRequest}`;
  private scope = (comparison: Pick<BrowserComparison, 'host' | 'repository' | 'pullRequest'>, pullRequest = true): CacheScope => ({ repository: `${comparison.host}/${comparison.repository.toLowerCase()}`, ...(pullRequest ? { pullRequest: comparison.pullRequest } : {}) });
  /** Serializes work on one key so a read-measure-write on a report cannot lose another tab's write. */
  private exclusive<T>(key: string, work: () => Promise<T>): Promise<T> {
    const next = (this.chains.get(key) ?? Promise.resolve()).then(work, work); const tail = next.then(() => undefined, () => undefined);
    this.chains.set(key, tail); void tail.then(() => { if (this.chains.get(key) === tail) this.chains.delete(key); }); return next;
  }
  private async optional<T>(operation: () => Promise<T>): Promise<T | undefined> {
    try { return await operation(); } catch (error) { try { await this.dependencies.cacheFailed?.(error); } catch { /* Reporting a cache failure never fails analysis. */ } return undefined; }
  }
  /** One start-up pass: entries made under another meaning are removed before anything reads them. */
  private async prepare(settings: Settings): Promise<void> {
    await (this.ready ??= (async () => { await this.optional(() => this.cache.purgeIncompatible(this.compat)); })());
    await this.optional(() => this.cache.configure(Number(settings['cache.maximumSize'])));
  }
  private guard(comparison: BrowserComparison, settings: Settings): void {
    if (isPaused(settings, comparison.repository)) throw new ExtensionError('REPOSITORY_PAUSED', 'diffdevil is paused for this repository. Resume it from the report or Settings.');
  }
  private async storedReport(comparison: BrowserComparison, settings: Settings): Promise<StoredReport | undefined> {
    const raw = await this.optional(() => this.cache.get<StoredReport>(this.reportKey(comparison), this.compat.report)); if (!raw) return undefined;
    return { report: raw.report, coverage: readCoverage(raw.coverage, Number(settings['analysis.maximumFiles'])), at: raw.at };
  }
  /** The newest in-memory copy of a comparison's report; used when the persistent cache cannot hold it. */
  private resident(reportKey: string): Context | undefined { for (const context of [...this.contexts.values()].reverse()) if (context.reportKey === reportKey) return context; return undefined; }
  private async persist(comparison: BrowserComparison, stored: StoredReport, generation: number): Promise<void> {
    const known = facts(stored.report, stored.coverage); const total = known.length; const done = known.filter(file => file.measured).length; const declined = known.filter(file => file.declined).length;
    await this.optional(() => this.cache.put(this.reportKey(comparison), 'report', this.scope(comparison), this.compat.report, stored, generation,
      { base: comparison.base, head: comparison.head, files: Math.max(total, comparison.changedFiles ?? 0), measured: done, declined, bounded: Math.max(total, comparison.changedFiles ?? 0) - done - declined }));
  }
  private async storedPolicy(comparison: BrowserComparison): Promise<StoredPolicy | undefined> { return this.optional(() => this.cache.get<StoredPolicy>(this.policyKey(comparison), this.compat.policy)); }
  /** Evidence for the policy layers selected now, from the cache alone. Without it a repository policy cannot be known, so the context is expired rather than guessed. */
  private async policyEvidence(comparison: BrowserComparison, settings: Settings, resident?: Context): Promise<Evidence> {
    if (selectedPolicy(settings, comparison.repository).mode === 'personal-only') return { policy: { status: 'unavailable', at: 0 } };
    const stored = await this.storedPolicy(comparison); if (!stored && resident) return resident.evidence;
    if (!stored) throw new ExtensionError('CONTEXT_EXPIRED', 'The analysis context was evicted and its policy evidence is no longer held. Refresh the report.');
    const { templates, ...policy } = stored;
    const present = Object.fromEntries(Object.entries(templates ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    return { policy, ...(Object.keys(present).length ? { templates: present } : {}) };
  }
  /** The view of stored facts under the settings in force now. Nothing here reads the provider. */
  private async project(comparison: BrowserComparison, stored: StoredReport, evidence: Evidence, settings: Settings, cached: boolean): Promise<Context> {
    const { report, coverage } = stored; const selected = selectedPolicy(settings, comparison.repository); let policy: BrowserPolicy | undefined; let errors: readonly Diagnostic[] = [];
    if (!evidence.policy || !['present', 'absent', 'unavailable'].includes(evidence.policy.status) || evidence.policy.status === 'present' && typeof evidence.policy.text !== 'string') throw new ExtensionError('POLICY_EVIDENCE', 'Policy acquisition standing is invalid.');
    if (selected.mode !== 'personal-only' && evidence.policy.status === 'unavailable') errors = [errorDiagnostic('REPOSITORY_POLICY_UNAVAILABLE', 'The exact base policy could not be read. Facts remain visible. Select Personal only explicitly to classify without repository policy.')];
    else {
      const result = compileBrowserPolicy(JSON.stringify({ ...selected, ...(evidence.policy.status === 'present' ? { repository: evidence.policy.text } : {}), ...(evidence.templates ? { templateFiles: evidence.templates } : {}) }));
      if (result.ok) policy = result.value; else errors = result.diagnostics;
    }
    const projection = humanReport(report, policy, undefined, errors);
    if (!projection.ok) throw new ExtensionError('REPORT_VIEW', projection.diagnostics.map(item => item.message).join('\n'));
    const digest = policy ? policy.digest : await sha256(JSON.stringify([selected, errors]));
    const key = `${comparisonKey(comparison)}:${report.reportId}:${digest}`; const view = decorateView(projection.value, settings);
    const known = facts(report, coverage); const files: PacketFile[] = report.files.map((file, index) => ({ path: file.path, ...(file.oldPath === undefined ? {} : { oldPath: file.oldPath }), standing: standing(known[index]!), ...(known[index]!.declined && !known[index]!.measured ? { reason: known[index]!.declined } : {}) }));
    const total = report.fileSet.total.status === 'exact' ? report.fileSet.total.value : undefined;
    // The reader needs the aggregate, not every file record again; file views are projected on request.
    const packet: Packet = { key, comparison, view: { ...view, report: { ...view.report, files: [] } }, files, refreshedAt: stored.at, cached,
      coverage: summarize(known, total, coverage) };
    return { key, reportKey: this.reportKey(comparison), evidence, packet, view, report, coverage, ...(policy ? { policy } : {}), errors, settings, files: new Map(), byPath: new Map(report.files.map(file => [file.path, file])) };
  }
  private remember(context: Context): Context {
    this.contexts.delete(context.key); this.contexts.set(context.key, context);
    while (this.contexts.size > MAXIMUM_CONTEXTS) this.contexts.delete(this.contexts.keys().next().value!);
    return context;
  }
  /** Drop accelerated contexts, because settings or the facts under them changed. */
  forget(match?: (context: { comparison: BrowserComparison }) => boolean): void {
    for (const [key, context] of this.contexts) if (!match || match(context.packet)) this.contexts.delete(key);
  }
  /** Single flight: identical input under identical settings shares one analysis; three analyses at most run at once. */
  async run(input: AnalysisInput, settings: Settings): Promise<Packet> {
    const key = await sha256(JSON.stringify([input, settings])); const existing = this.running.get(key); if (existing) return existing;
    if (this.running.size >= MAXIMUM_CONCURRENT) throw new ExtensionError('ANALYSIS_BUSY', 'Three analyses are already active. Retry when one completes.');
    const operation = this.analyze(input, settings).finally(() => { this.running.delete(key); }); this.running.set(key, operation); return operation;
  }
  private async analyze(input: AnalysisInput, settings: Settings): Promise<Packet> {
    const comparison = readComparison(input.comparison); this.guard(comparison, settings); const generation = this.cache.generation; await this.prepare(settings);
    const limit = Number(settings['analysis.maximumFiles']);
    // Equal comparisons share one report: the second request finds what the first stored instead of analyzing again.
    const { stored, cached } = await this.exclusive(this.reportKey(comparison), async () => {
      const held = await this.storedReport(comparison, settings); if (held) return { stored: held, cached: true };
      if (!input.acquisition) throw new ExtensionError('CACHE_MISS', 'Source is required for this uncached comparison.');
      if (comparisonKey(input.acquisition.comparison) !== comparisonKey(comparison)) throw new ExtensionError('SOURCE_IDENTITY', 'The source does not match the requested comparison.');
      const result = analyzeBrowserInput(JSON.stringify(input.acquisition));
      if (!result.ok) throw new ExtensionError(result.diagnostics[0]?.code ?? 'SOURCE_INVALID', result.diagnostics.map(item => item.message).join('\n'));
      const report = result.value; const exact = new Set(report.files.filter(measured).map(file => file.path));
      const declined: Record<string, DeclineReason> = Object.create(null) as Record<string, DeclineReason>;
      for (const [path, reason] of Object.entries(input.coverage?.declined ?? {})) if (isDeclineReason(reason) && !exact.has(path) && report.files.some(file => file.path === path)) declined[path] = reason;
      const fresh: StoredReport = { report, coverage: { ...emptyCoverage(input.coverage?.limit ?? limit), automatic: exact.size, declined }, at: this.now() };
      await this.persist(comparison, fresh, generation);
      await this.optional(() => this.cache.put(this.pointerKey(comparison), 'pointer', this.scope(comparison), this.compat.pointer, { comparison, at: fresh.at } satisfies Pointer, generation));
      return { stored: fresh, cached: false };
    });
    if (!input.policy) throw new ExtensionError('POLICY_EVIDENCE', 'Policy acquisition standing is invalid.');
    // Trusted-base policy is immutable for its base, so it is written once; templates found later join it.
    const held = input.policy.status === 'unavailable' ? undefined : await this.storedPolicy(comparison);
    const templates: Record<string, string | null> = { ...(held?.templates ?? {}), ...(input.templates ?? {}), ...Object.fromEntries((input.absentTemplates ?? []).map(path => [path, null])) };
    if (input.policy.status !== 'unavailable' && (!held || held.status !== input.policy.status || held.text !== input.policy.text || Object.keys(templates).length !== Object.keys(held.templates ?? {}).length)) {
      await this.optional(() => this.cache.put(this.policyKey(comparison), 'policy', this.scope(comparison, false), this.compat.policy, { ...input.policy, ...(Object.keys(templates).length ? { templates } : {}) } satisfies StoredPolicy, generation));
    }
    // A fast reattachment carries no templates: the trusted ones already held for this base complete the policy.
    const present = Object.fromEntries(Object.entries(templates).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    const evidence = { policy: input.policy, ...(Object.keys(present).length ? { templates: present } : {}) };
    const context = await this.project(comparison, stored, evidence, settings, cached);
    if (generation === this.cache.generation) {
      this.remember(context);
      await this.dependencies.remember?.(comparison, context.packet.refreshedAt);
    }
    return context.packet;
  }
  /** What the page may use at once: whether the report and policy are held, and how far the report was measured. */
  async lookup(comparison: BrowserComparison, settings: Settings): Promise<Lookup> {
    const selected = selectedPolicy(settings, comparison.repository); await this.prepare(settings);
    if (isPaused(settings, comparison.repository)) return { settings, selected, reportCached: false, paused: true };
    const [stored, policy] = await Promise.all([this.storedReport(comparison, settings), this.storedPolicy(comparison)]);
    const { templates, ...source } = policy ?? ({} as StoredPolicy);
    return { settings, selected, reportCached: Boolean(stored), ...(policy ? { policy: source as PolicySource } : {}), ...(templates ? { templatePaths: Object.keys(templates) } : {}),
      ...(stored ? { coverage: summarize(facts(stored.report, stored.coverage), stored.report.fileSet.total.status === 'exact' ? stored.report.fileSet.total.value : undefined, stored.coverage) } : {}) };
  }
  /** The last comparison confirmed for a pull request, for a page that cannot name its own. */
  async recent(repository: string, pullRequest: number, settings: Settings): Promise<{ comparison?: BrowserComparison }> {
    await this.prepare(settings); const comparison = { host: 'github.com' as const, repository, pullRequest };
    if (isPaused(settings, repository)) return {};
    const pointer = await this.optional(() => this.cache.get<Pointer>(this.pointerKey(comparison), this.compat.pointer));
    return pointer ? { comparison: readComparison(pointer.comparison) } : {};
  }
  private async context(key: string, comparison: BrowserComparison, settings: Settings): Promise<Context> {
    const held = this.contexts.get(key); if (held) return held;
    this.guard(comparison, settings); await this.prepare(settings);
    const stored = await this.storedReport(comparison, settings); if (!stored) throw new ExtensionError('CONTEXT_EXPIRED', 'The analysis context was evicted and its report is no longer held. Refresh the report.');
    return this.remember(await this.project(comparison, stored, await this.policyEvidence(comparison, settings), settings, true));
  }
  async files(key: string, comparisonInput: BrowserComparison, paths: string[], settings: Settings): Promise<Record<string, HumanReportView>> {
    const comparison = readComparison(comparisonInput); const context = await this.context(key, comparison, settings);
    const result: Record<string, HumanReportView> = Object.create(null) as Record<string, HumanReportView>;
    for (const path of paths) {
      const file = context.byPath.get(path) ?? context.report.files.find(item => item.oldPath === path); if (!file) continue;
      let view = context.files.get(file.path);
      if (!view) {
        const projection = humanReport(context.report, context.policy, file.path, context.errors);
        if (!projection.ok) throw new ExtensionError('FILE_VIEW', projection.diagnostics.map(item => item.message).join('\n'));
        view = decorateView(projection.value, context.settings); context.files.set(file.path, view);
        // Visible files are cheap to rebuild; retain at most 150 projections.
        while (context.files.size > FOCUSED_PROJECTIONS) context.files.delete(context.files.keys().next().value!);
      }
      result[path] = view;
    }
    return result;
  }
  /** The exact text the CLI prints for the same scope. */
  async text(key: string, comparisonInput: BrowserComparison, path: string | undefined, settings: Settings): Promise<string> {
    const comparison = readComparison(comparisonInput); const context = await this.context(key, comparison, settings); let view = context.view;
    if (path !== undefined) {
      const projection = humanReport(context.report, context.policy, path, context.errors);
      if (!projection.ok) throw new ExtensionError('FILE_VIEW', projection.diagnostics.map(item => item.message).join('\n'));
      view = projection.value;
    }
    const rendered = formatReport(view.report, 'human', { color: false });
    if (!rendered.ok) throw new ExtensionError('REPORT_TEXT', rendered.diagnostics.map(item => item.message).join('\n'));
    return rendered.value.stdout;
  }
  /**
   * Measure bounded files from patch text fetched by the page. The persisted report is replaced by the
   * engine's own recomputation, coverage records what the work was, and nothing is extrapolated.
   */
  async extend(request: { comparison: BrowserComparison; patches: { path: string; patch: string }[]; declined?: Record<string, DeclineReason>; via: MeasureVia }, settings: Settings): Promise<Packet> {
    const comparison = readComparison(request.comparison); this.guard(comparison, settings); const generation = this.cache.generation; await this.prepare(settings);
    if (!['automatic', 'visible', 'explicit'].includes(request.via)) throw new ExtensionError('MEASURE_VIA', 'Unknown measurement request.');
    const limit = Number(settings['analysis.maximumFiles']); const key = this.reportKey(comparison);
    return this.exclusive(key, async () => {
      const resident = this.resident(key); const stored = await this.storedReport(comparison, settings) ?? (resident && { report: resident.report, coverage: resident.coverage, at: resident.packet.refreshedAt });
      if (!stored) throw new ExtensionError('CACHE_MISS', 'This comparison is no longer held. Refresh the report.');
      const allowance = request.via === 'visible' ? topUpRemaining(stored.coverage, limit) : request.via === 'automatic' ? automaticRemaining(stored.coverage, limit) : Infinity;
      const outcome = measureBoundedFiles(stored.report, request.patches.slice(0, Math.min(request.patches.length, allowance)));
      if (!outcome.ok) throw new ExtensionError('MEASURE_FAILED', outcome.diagnostics.map(item => item.message).join('\n'));
      const { report, measured: gained } = outcome.value; const exact = new Set(gained); const unmeasured = new Set(report.files.filter(file => !measured(file)).map(file => file.path));
      const declined: Record<string, DeclineReason> = Object.create(null) as Record<string, DeclineReason>;
      for (const [path, reason] of [...Object.entries(stored.coverage.declined), ...Object.entries(request.declined ?? {})]) if (isDeclineReason(reason) && unmeasured.has(path) && !exact.has(path)) declined[path] = reason;
      const count = gained.length; const coverage: Coverage = { ...stored.coverage, declined,
        ...(request.via === 'automatic' ? { automatic: stored.coverage.automatic + count, limit } : request.via === 'visible' ? { topUp: stored.coverage.topUp + count } : { explicit: stored.coverage.explicit + count }) };
      const next: StoredReport = { report, coverage, at: stored.at };
      await this.persist(comparison, next, generation);
      this.forget(context => this.reportKey(context.comparison) === key);
      const context = await this.project(comparison, next, await this.policyEvidence(comparison, settings, resident), settings, true);
      if (generation === this.cache.generation) this.remember(context);
      return context.packet;
    });
  }
  inventory(): Promise<Inventory> { return this.cache.inventory(); }
  async clearReports(): Promise<void> { await this.cache.clear('report'); this.forget(); }
  async clearPolicies(): Promise<void> { await this.cache.clear('policy'); this.forget(); }
  async clearAll(): Promise<void> { await this.cache.clear(); this.forget(); }
  /** Forget one repository, or one pull request of it, without touching settings, policy overrides or pause. */
  async clearScope(repository: string, pullRequest?: number): Promise<number> {
    const scope: CacheScope = { repository: `github.com/${repository.toLowerCase()}`, ...(pullRequest === undefined ? {} : { pullRequest }) };
    const removed = await this.cache.clearScope(scope);
    this.forget(context => context.comparison.repository.toLowerCase() === repository.toLowerCase() && (pullRequest === undefined || context.comparison.pullRequest === pullRequest)); return removed;
  }
}
