import { stringify as stringifyYaml } from 'yaml';
import { runEffectCommand } from './effects.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureAsync, fail, unwrap } from '../errors.js';
import { formatQuery, formatReportWithOptions, type QueryFormat, type ReportFormat, type Rendered } from '../format.js';
import { requireType } from '../language/types.js';
import { environmentFromReport } from '../language/environment.js';
import { evaluateExpression } from '../language/evaluate.js';
import { compileExpression } from '../language/text.js';
import type { ExpressionSource } from '../language/source.js';
import { DEFAULT_LIMITS } from '../limits.js';
import { compileShortcut, expandShortcut } from '../language/shortcuts.js';
import { unknownValue, textValue } from '../language/values.js';
import { analyzeDiff, readReport, withPathPolicy } from '../report.js';
import { analyzeGit } from '../sources/git.js';
import { GitHubClient } from '../github/client.js';
import { analyzeGitHub } from '../github/source.js';
import type { Diagnostic, Report, Result } from '../model.js';
import type { TextPresentationOptions } from '../presentation.js';
import { readUtf8, stdinText, writeAtomic } from '../hosts/io.js';
import { loadPolicy } from './policy.js';
import { evaluatePolicy, evaluatePolicyQuery, type PolicyQuerySelector } from '../policy/evaluate.js';
import { createPlan, type PlanOptions } from '../policy/plan.js';
import { explainPolicy } from '../policy/compile.js';
import { formatPlanWithOptions } from '../policy/format.js';
import { parseInvocation, type Invocation } from './arguments.js';

export const HELP=`diffdevil

Measure changes. Match rules. Act on the result.

  diffdevil analyze [source] --format json|human|markdown|agent|jsonl|env
  diffdevil query [source] --metric changed --format value
  diffdevil query [source] --expr 'totals.lines.changed' --format value
  diffdevil check [source] --expr-file condition.ddexpr
  diffdevil check [source] --metric changed --gt 100
  diffdevil check [source] --files any --metric changed --gt 100
  diffdevil query [source] --files --metric modified --gt 20 --select path
  diffdevil plan [source] --config policy.json --format json
  diffdevil validate --config policy.json
  diffdevil explain --policy --config policy.json --format json
  diffdevil explain [shortcut flags]
  diffdevil apply --repo OWNER/REPO --pr NUMBER [--config base-policy.yml]
  diffdevil apply --plan PATH [--config base-policy.yml]
  diffdevil labels verify|apply --repo OWNER/REPO [--config policy.yml]
  diffdevil schema --kind report|config|query|plan|language|metrics

Sources: --diff-file PATH, --stdin, --report PATH, --staged,
         --base REF --head REF [--comparison direct], or tracked worktree.
Selection: --scope NAME, repeated --path PATTERN, --all-files, --certain.
Path policy: repeated --exclude, --include-only, or --force-include PATTERN.
Human presentation: --detail summary|full; --color auto|always|never.
Output: --output PATH, --diagnostics json. Check exits: 0 true, 1 false,
        2 invalid operation, 3 unresolved evidence.

detail selectors: --expr TEXT, --expr-file PATH, or --expr-stdin.
Expressions and shortcuts share the same binder, type checker, and evaluator.
Read-only policy: --config .diffdevil.yml, --preset size@1|none, --no-config,
        --param NAME=VALUE (repeatable), --params-file bindings.json.
Apply policy: built-in defaults, --config from the PR base, or an explicit
  --policy-source workspace|pinned [--policy-ref FULL_SHA --policy-repository OWNER/REPO].
Apply sources: fresh API by default; --git uses current PR commits locally;
  --report PATH --trust-report deliberately reuses a trusted bound report.
Apply controls: --rule ID, --comment-author LOGIN [--comment-author-id ID],
  --occasion ID for create-mode comments. No policy discovery in write commands.
Plan target: --target-repo OWNER/REPO --target-pr NUMBER when not in source.
Definitions: plan none|ensure|sync; apply also verify; labels apply ensure|sync.
JSON/YAML policies and read-only GitHub sources are implemented.
GitHub source: --repo OWNER/REPO --pr NUMBER. Token: GH_TOKEN or GITHUB_TOKEN.
No credential is accepted in a command-line flag. Explicit apply and label commands reconcile only selected policy effects.
`;
/** Acquire detail text without interpreting it or changing its original offsets. */
async function readExpression(invocation: Invocation, cwd: string): Promise<ExpressionSource | undefined> {
  const values = invocation.values;
  // TextDecoder's ignoreBOM option preserves U+FEFF. The lexer owns BOM handling.
  const input = { maximum: DEFAULT_LIMITS.expressionBytes, preserveBom: true };
  switch (invocation.expressionSelector) {
    case 'expr':
      return { text: String(values.expr), language: 'diffdevil-expr/1', name: '--expr' };
    case 'expr-file': {
      const path = resolve(cwd, String(values['expr-file']));
      return { text: await readUtf8(path, input), language: 'diffdevil-expr/1', name: path };
    }
    case 'expr-stdin':
      return { text: await stdinText(input), language: 'diffdevil-expr/1', name: 'stdin:expression' };
    default:
      return undefined;
  }
}

export interface CliColorStream {
  readonly isTTY?: boolean;
  hasColors?(count?: number, env?: object): boolean;
}
export interface CliHost {
  readonly githubClient?: GitHubClient;
  readonly stdout?: CliColorStream;
  readonly env?: NodeJS.ProcessEnv;
}

function hostEnvironment(host: CliHost): NodeJS.ProcessEnv { return host.env??process.env; }

export function githubClientForHost(host: CliHost): GitHubClient {
  if (host.githubClient) return host.githubClient;
  const env=hostEnvironment(host), token=env.GH_TOKEN??env.GITHUB_TOKEN, apiUrl=env.GITHUB_API_URL;
  return new GitHubClient({...(token?{token}:{}),...(apiUrl?{apiUrl}:{})});
}

function presentationColor(invocation: Invocation, host: CliHost): boolean {
  const mode=String(invocation.values.color??'auto');
  if(mode==='always') return true;
  if(mode==='never') return false;
  if(invocation.values.output!==undefined) return false;
  const env=hostEnvironment(host);
  if(env.FORCE_COLOR!==undefined) return env.FORCE_COLOR!=='0';
  if(env.NO_COLOR!==undefined) return false;
  const stdout=host.stdout??process.stdout;
  return stdout.isTTY===true && typeof stdout.hasColors==='function' && stdout.hasColors(16_777_216,env);
}

function presentationOptions(invocation: Invocation, host: CliHost): TextPresentationOptions {
  return {
    detail: invocation.values.detail==='full'?'full':'summary',
    color: presentationColor(invocation,host),
  };
}

async function source(invocation:Invocation,cwd:string,selectedPolicy:boolean,host:CliHost):Promise<Report>{
  const v=invocation.values;
  let report:Report;
  if(v.pr&&v.repo) {
    const client=githubClientForHost(host);
    report=unwrap(await analyzeGitHub(client,{repository:String(v.repo),pullRequest:Number(v.pr)}));
  }
  else if(v.report) report=unwrap(readReport(await readUtf8(resolve(cwd,String(v.report)))));
  else if(v['diff-file']||v.stdin) report=unwrap(analyzeDiff(v.stdin?await stdinText():await readUtf8(resolve(cwd,String(v['diff-file'])))));
  else report=unwrap(await analyzeGit({cwd,...(v.staged?{staged:true}:{}),...(v.base?{base:String(v.base),head:String(v.head)}:{}),...(v.comparison?{comparison:String(v.comparison) as 'direct'|'three-dot'}:{})}));
  if(!selectedPolicy&&(v.exclude||v['include-only']||v['force-include'])) report=withPathPolicy(report,{...(v.exclude?{exclude:v.exclude as string[]}:{}),...(v['include-only']?{includeOnly:v['include-only'] as string[]}:{}),...(v['force-include']?{forceInclude:v['force-include'] as string[]}:{})});
  return report;
}
/** Core invocation returns data; only the thin main entry point writes stdout. */
export function runCli(argv:readonly string[],defaultCwd=process.cwd(),host:CliHost={}):Promise<Result<Rendered>>{
  return captureAsync(async()=>{
    const invocation=parseInvocation(argv), v=invocation.values, cwd=resolve(defaultCwd,String(v.cwd??'.'));
    let output:Rendered;
    if(v.help) output={stdout:HELP,exitCode:0};
    else if(v.version) {
      const metadata: unknown = JSON.parse(await readUtf8(fileURLToPath(new URL('../../../package.json', import.meta.url))));
      const version = metadata && typeof metadata === 'object' && 'version' in metadata ? metadata.version : undefined;
      if (typeof version !== 'string' || !version || /[\r\n\0]/u.test(version)) fail('E_PACKAGE', 'Installed package metadata has no valid version.', 'source');
      output = { stdout: version + '\n', exitCode: 0 };
    }
    else if(invocation.command==='apply'||invocation.command.startsWith('labels ')) output=await runEffectCommand(invocation,cwd,githubClientForHost(host));
    else if(invocation.command==='schema'){
      const kinds:Record<string,string>={report:'src/diffdevil/contracts/schemas/report-v1.schema.json',config:'src/diffdevil/contracts/schemas/policy-v1.schema.json',query:'src/diffdevil/contracts/schemas/query-result-v1.schema.json',plan:'src/diffdevil/contracts/schemas/plan-v1.schema.json',language:'src/diffdevil/contracts/detail/v1/profile.json',metrics:'src/diffdevil/contracts/detail/v1/shortcuts.json'};
      const path=kinds[String(v.kind??'report')];if(!path) fail('E_USAGE','Unknown schema kind.','config');
      output={stdout:await readUtf8(fileURLToPath(new URL('../../../'+path,import.meta.url)))+'\n',exitCode:0};
    }else if(invocation.command==='explain'&&invocation.shortcut&&!v.policy){
      const expansion=unwrap(expandShortcut(invocation.shortcut));
      output={stdout:v.format==='json'?JSON.stringify(expansion)+'\n':expansion.expression+'\n',exitCode:0};
    }else{
      if(!['analyze','query','check','plan','validate','explain'].includes(invocation.command)) fail('E_USAGE',`Command ${invocation.command} is not implemented. See --help.`,'config');
      const selected = await loadPolicy(invocation, cwd);
      if(invocation.command==='validate'||invocation.command==='explain') {
        if(!selected) fail('E_REPORT_CONTEXT','Select a policy to validate or explain.','config');
        const view = explainPolicy(selected.policy);
        if(invocation.command==='explain') {
          if(v.format && v.format!=='json' && v.format!=='yaml') fail('E_FORMAT','Policy explanations support JSON or YAML.','format');
          output={stdout:v.format==='yaml'?stringifyYaml(view.document):JSON.stringify(view,null,2)+'\n',exitCode:0};
        } else {
          if(v.format && !['json','human'].includes(String(v.format))) fail('E_FORMAT','Validation supports human or JSON output.','format');
          output={stdout:v.format==='json'?JSON.stringify({valid:true,policyId:selected.policy.id,requiredParameters:selected.policy.requiredParameters})+'\n':'Policy is valid.\n',exitCode:0};
        }
      } else {
        let report=await source(invocation,cwd,selected!==undefined,host);
        if(invocation.command==='plan') {
          if(!selected) fail('E_REPORT_CONTEXT','Planning needs an explicit policy or selected built-in defaults.','config');
          const evaluated=unwrap(evaluatePolicy(selected.policy,report,{parameters:selected.parameters}));
          const repository=String(v['target-repo']??report.source.repository??'');
          const pullRequest=v['target-pr']===undefined?report.source.pullRequest:Number(v['target-pr']);
          if(!repository||pullRequest===undefined) fail('E_PLAN_TARGET','A local diff requires --target-repo OWNER/REPO and --target-pr NUMBER to create a GitHub effect plan.','plan');
          const plan=unwrap(createPlan(evaluated,{repository,pullRequest},{definitions:String(v.definitions??'none') as NonNullable<PlanOptions['definitions']>,...(v.rule===undefined?{}:{rules:[String(v.rule)]})}));
          output=unwrap(formatPlanWithOptions(plan,String(v.format??'human'),presentationOptions(invocation,host)));
          if(v['require-resolved']&&plan.held.length) output={...output,exitCode:3};
        } else if(invocation.command==='analyze') {
          if(selected) report=unwrap(evaluatePolicy(selected.policy,report,{parameters:selected.parameters,phase:'analyze'})).report;
          output=unwrap(formatReportWithOptions(report,String(v.format??'human') as ReportFormat,presentationOptions(invocation,host)));
        } else {
          const expression=await readExpression(invocation,cwd);
          let evaluated;
          if(selected) {
            const selector:PolicyQuerySelector = invocation.expressionSelector==='name' ? {query:String(v.name)} : v.band ? {band:String(v.band)} : expression??invocation.shortcut!;
            const queried=unwrap(evaluatePolicyQuery(selected.policy,report,selector,{parameters:selected.parameters,context:invocation.command==='check'?'condition':'query'}));
            report=queried.report; evaluated=queried.result;
          } else if(invocation.expressionSelector==='name') {
            fail('E_REPORT_CONTEXT','A saved query needs its policy source; select --config. Stored metric values remain available with --metric metrics.NAME.','bind');
          } else if(v.band) {
            const band=report.bands?.[String(v.band)];if(!band) fail('E_REPORT_CONTEXT','The report has no selected band result.','bind');
            evaluated={value:band.status==='resolved'?textValue(band.id):unknownValue('string',band.reasons),evidence:[],work:0};
          } else {
            const environment=unwrap(environmentFromReport(report));
            const compiled=expression===undefined?unwrap(compileShortcut(invocation.shortcut!,{environment:environment.schema})):unwrap(compileExpression(expression,{environment:environment.schema,context:'query'}));
            if(invocation.command==='check') requireType(compiled.resultType,'boolean');
            evaluated=unwrap(evaluateExpression(compiled,environment));
          }
          output=unwrap(formatQuery(evaluated,{command:invocation.command as 'query'|'check',...(v.format?{format:String(v.format) as QueryFormat}:invocation.command==='query'&&v.files?{format:'lines' as const}:{}),report}));
        }
      }
    }
    if(v.output){
      await writeAtomic(resolve(cwd,String(v.output)),output.stdout);
      return {...output,stdout:''};
    }
    return output;
  });
}
export function formatDiagnostic(d:Diagnostic,json=false):string{return json?JSON.stringify(d)+'\n':`${d.code}: ${d.message}${d.range?` [${d.range.start}:${d.range.end}]`:''}\n`;}
