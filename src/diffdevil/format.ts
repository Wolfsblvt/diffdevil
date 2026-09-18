import { capture, fail } from './errors.js';
import { DEFAULT_LIMITS, enforceBytes } from './limits.js';
import { SEMANTICS, type CollectionValue, type NumericMeasurement, type Report, type Result, type Value } from './model.js';
import type { EvaluationResult } from './language/evaluate.js';
import {
  agentBand,
  agentMeasurement,
  agentRule,
  agentSemantics,
  agentSource,
  evidenceLabel,
  humanBand,
  humanIdentifier,
  humanMeasurement,
  humanRule,
  humanSignedMeasurement,
  humanSource,
  measurementReasonSuffix,
  padLabel,
  paintAdded,
  paintBrand,
  paintDeleted,
  paintPrimary,
  paintQuiet,
  paintStrong,
  reasonCodes,
  type TextPresentationOptions,
} from './presentation.js';

export interface Rendered { readonly stdout:string; readonly exitCode:0|1|2|3 }
export type QueryFormat='value'|'lines'|'nul'|'json'|'jsonl';
export function queryEnvelope(result:EvaluationResult,report?:Report):unknown {
  return {kind:'diffdevil.query',schemaVersion:'1.0',semantics:report?.semantics??SEMANTICS,...(report?{source:report.source,...(report.reportId?{reportId:report.reportId}:{})}:{}),value:result.value,evidence:result.evidence};
}
function unresolved():never { return fail('E_RESULT_UNRESOLVED','Available evidence cannot establish the requested strict result. Use canonical JSON to retain the evidence.','format'); }
function determined(value:Value):CollectionValue {
  if(value.kind!=='collection') fail('E_FORMAT_TYPE','This output format requires a collection.','format');
  if(value.unseen.possible || value.items.some(item=>item.membership!=='definite') || value.order!=='known') unresolved();
  return value;
}
function plain(value:Value):unknown {
  switch(value.kind) {
    case 'number':
      if(value.measurement.status!=='exact') return unresolved();
      if(!Number.isFinite(value.measurement.value) || value.numericType==='integer'&&!Number.isSafeInteger(value.measurement.value)) fail('E_FORMAT_TYPE','Invalid numeric output value.','format');
      return value.measurement.value;
    case 'boolean': if(value.decision.status!=='resolved') return unresolved(); return value.decision.value;
    case 'string': return value.value;
    case 'null': return null;
    case 'unknown': return unresolved();
    case 'missing': fail('E_FORMAT_TYPE','Plain output cannot omit a structurally missing value.','format');
    case 'record': return Object.fromEntries(Object.entries(value.fields).map(([key,v])=>[key,plain(v)]));
    case 'collection': return determined(value).items.map(item=>plain(item.value));
  }
}
function scalar(value:Value, nul=false):string {
  if(value.kind==='unknown') unresolved();
  if(nul ? value.kind!=='string' : !['number','boolean','string'].includes(value.kind)) fail('E_FORMAT_TYPE',nul?'NUL output requires strings.':'This output requires an exact present scalar.','format');
  const text=String(plain(value));
  if(nul?text.includes('\0'):/[\r\n\0]/.test(text)) fail('E_FORMAT_DELIMITER','The value contains a delimiter that this output format cannot represent. Use canonical JSON or NUL-delimited paths.','format');
  return text;
}
/** Validate the whole strict result before emitting any stdout bytes. */
export function formatQuery(result:EvaluationResult, options:{command?:'query'|'check';format?:QueryFormat;report?:Report}={}):Result<Rendered> {
  return capture(()=>{
    const command=options.command??'query', format=options.format;
    let exitCode:Rendered['exitCode']=0, stdout='';
    if(command==='check') {
      if(result.value.kind!=='boolean') fail('E_FORMAT_TYPE','A check requires a boolean decision.','format');
      if(format!==undefined && format!=='json') fail('E_FORMAT_TYPE','Checks support silent output or canonical JSON.','format');
      const d=result.value.decision; exitCode=d.status==='unknown'?3:d.value?0:1;
      if(format==='json') stdout=JSON.stringify(queryEnvelope(result,options.report))+'\n';
    } else switch(format??'value') {
      case 'json': stdout=JSON.stringify(queryEnvelope(result,options.report))+'\n';break;
      case 'value': stdout=scalar(result.value)+'\n';break;
      case 'lines': stdout=determined(result.value).items.map(item=>scalar(item.value)+'\n').join('');break;
      case 'nul': stdout=determined(result.value).items.map(item=>scalar(item.value,true)+'\0').join('');break;
      case 'jsonl': stdout=determined(result.value).items.map(item=>JSON.stringify(plain(item.value))+'\n').join('');break;
      default: fail('E_FORMAT_TYPE',`Unsupported query output format ${String(format)}.`,'format');
    }
    enforceBytes(stdout,DEFAULT_LIMITS.resultBytes,'Selected output','format');
    return {stdout,exitCode};
  });
}
export function displayMeasurement(value:NumericMeasurement):string {
  if(value.status==='exact') return String(value.value);
  if(value.status==='bounded') return `${value.lower}–${value.upper} (bounded)`;
  if(value.status==='unknown') return `unknown${value.lower===undefined?'':`; minimum ${value.lower}`}${value.upper===undefined?'':`; maximum ${value.upper}`}`;
  return 'unmeasurable';
}

export type ReportFormat='human'|'markdown'|'agent'|'json'|'jsonl'|'env';

function markdownEscape(value: unknown): string {
  return String(value).replaceAll('|','\\|').replaceAll('<','&lt;').replaceAll('`','\\`');
}

function reportMarkdown(report: Report): string {
  const rows: readonly (readonly [string, string])[] = [
    ['Source', report.source.kind],
    ['Comparison', report.source.comparison??'supplied'],
    ['Measurement', report.measurement.status],
    ['Added only', displayMeasurement(report.totals.lines.added)],
    ['Deleted only', displayMeasurement(report.totals.lines.deleted)],
    ['Modified', displayMeasurement(report.totals.lines.modified)],
    ['Changed', displayMeasurement(report.totals.lines.changed)],
    ['Raw additions', displayMeasurement(report.totals.raw.added)],
    ['Raw deletions', displayMeasurement(report.totals.raw.deleted)],
    ['Raw churn', displayMeasurement(report.totals.raw.churn)],
    ...Object.entries(report.totals.files).map(([key,value])=>[`Files ${key}`,displayMeasurement(value)] as const),
    ...Object.entries(report.metrics??{}).map(([key,value])=>[`Metric ${JSON.stringify(key)}`,displayMeasurement(value)] as const),
    ...Object.entries(report.bands??{}).map(([key,value])=>[`Band ${JSON.stringify(key)}`,value.status==='resolved'?JSON.stringify(value.id):`unknown; candidates ${JSON.stringify(value.candidates)}`] as const),
    ...Object.entries(report.rules??{}).map(([key,value])=>[`Rule ${JSON.stringify(key)}`,humanRule(value)] as const),
  ];
  return '# diffdevil analysis\n\n| Fact | Value |\n| --- | --- |\n'+rows.map(row=>'| '+row.map(markdownEscape).join(' | ')+' |').join('\n')+'\n';
}

function humanMetricEntries(report: Report, full: boolean): readonly (readonly [string, NumericMeasurement])[] {
  const entries = Object.entries(report.metrics??{});
  if(full || entries.length<=3) return entries;
  const selected = entries.slice(0,3);
  for(const entry of entries.slice(3)) if(entry[1].status!=='exact') selected.push(entry);
  return selected;
}

function humanMetricsLine(report: Report, full: boolean): string | undefined {
  const all = Object.entries(report.metrics??{});
  if(!all.length) return undefined;
  const selected=humanMetricEntries(report,full);
  const shown = new Set(selected.map(entry=>entry[0]));
  const values=selected.map(([name,value])=>`${humanIdentifier(name)} ${humanMeasurement(value,report.measurement.status)}${measurementReasonSuffix(value)}`);
  const remaining=all.filter(([name])=>!shown.has(name)).length;
  if(remaining) values.push(`… ${remaining} more`);
  return values.join(' · ');
}

function humanBandsLine(report: Report): string | undefined {
  const entries=Object.entries(report.bands??{});
  if(!entries.length) return undefined;
  return entries.sort((a,b)=>Number(a[1].status==='resolved')-Number(b[1].status==='resolved'))
    .map(([name,value])=>`${humanIdentifier(name)} → ${humanBand(value)}`).join(' · ');
}

function humanRulesLine(report: Report, full: boolean): string | undefined {
  const entries=Object.entries(report.rules??{});
  if(!entries.length) return undefined;
  if(full) return entries.map(([name,value])=>`${humanIdentifier(name)} ${humanRule(value)}`).join(' · ');
  const notable=entries.filter(([,value])=>value.disposition!=='unmatched'||value.decision?.status==='unknown'||value.band?.status==='unknown');
  const unmatched=entries.length-notable.length;
  const values=notable.map(([name,value])=>`${humanIdentifier(name)} ${humanRule(value)}`);
  if(unmatched) values.push(`${unmatched} unmatched`);
  return values.join(' · ');
}

function nonZeroOrNonExact(value: NumericMeasurement | undefined): boolean {
  return value!==undefined && (value.status!=='exact'||value.value!==0);
}

function humanFilesLine(report: Report): string {
  const files=report.totals.files;
  const values=[
    `${humanMeasurement(files.total??report.fileSet.total,report.measurement.status)} total`,
    ...(files.included===undefined?[]:[`${humanMeasurement(files.included,report.measurement.status)} included`]),
    ...(files.excluded===undefined?[]:[`${humanMeasurement(files.excluded,report.measurement.status)} excluded`]),
  ];
  if(nonZeroOrNonExact(files.binary)) values.push(`${humanMeasurement(files.binary!,report.measurement.status)} binary`);
  if(nonZeroOrNonExact(files.unmeasurable)) values.push(`${humanMeasurement(files.unmeasurable!,report.measurement.status)} unmeasurable`);
  if(!report.fileSet.complete) values.push('file set incomplete');
  return values.join(' · ');
}

function humanReportDetails(report: Report, color: boolean): string[] {
  const lines=['',paintStrong('Details',color)];
  lines.push(`  ${padLabel('Schema')} ${report.schemaVersion}`);
  if(report.reportId!==undefined) lines.push(`  ${padLabel('Report')} ${JSON.stringify(report.reportId)}`);
  if(report.policyId!==undefined) lines.push(`  ${padLabel('Policy')} ${JSON.stringify(report.policyId)}`);
  lines.push(`  ${padLabel('Source id')} ${JSON.stringify(report.source.comparisonId)}`);
  lines.push(`  ${padLabel('Semantics')} ${report.semantics.replacementLines} · ${report.semantics.language} · ${report.semantics.numbers} · ${report.semantics.paths}`);
  if(report.semantics.presets?.length) lines.push(`  ${padLabel('Presets')} ${report.semantics.presets.map(value=>JSON.stringify(value)).join(' · ')}`);
  if(report.semantics.limits!==undefined) lines.push(`  ${padLabel('Limits')} ${JSON.stringify(report.semantics.limits)}`);
  if(report.measurement.reasons.length) lines.push(`  ${padLabel('Evidence')} ${reasonCodes(report.measurement.reasons).join(' · ')}`);

  const fileEntries=Object.entries(report.totals.files);
  if(fileEntries.length){
    lines.push('',paintStrong('File categories',color));
    for(const [name,value] of fileEntries) lines.push(`  ${padLabel(humanIdentifier(name))} ${humanMeasurement(value,report.measurement.status)}${measurementReasonSuffix(value)}`);
  }
  const scopes=Object.entries(report.scopes??{});
  if(scopes.length){
    lines.push('',paintStrong('Scopes',color));
    for(const [name,scope] of scopes) lines.push(`  ${humanIdentifier(name)} · ${humanMeasurement(scope.totals.lines.changed,scope.fileSet.total.status)} changed · ${humanMeasurement(scope.totals.files.included??scope.fileSet.total,scope.fileSet.total.status)} files · ${scope.fileSet.complete?'complete':'incomplete'}`);
  }
  return lines;
}

function reportHuman(report: Report, options: TextPresentationOptions): string {
  const color=options.color===true, full=options.detail==='full';
  const lines:string[]=[
    `${paintBrand('diffdevil',color)} ${paintStrong('analysis',color)}`,
    `${paintQuiet(humanSource(report.source),color)} · ${paintStrong(evidenceLabel(report.measurement.status),color)}`,
  ];
  if(report.measurement.reasons.length) lines.push(`${paintQuiet('Evidence',color)}   ${reasonCodes(report.measurement.reasons).join(' · ')}`);
  lines.push('');

  const changed=humanMeasurement(report.totals.lines.changed,report.measurement.status);
  lines.push(paintPrimary(`${padLabel('Changed')}${changed} lines`,color));
  lines.push(`  ${paintAdded(humanSignedMeasurement('+',report.totals.lines.added,report.measurement.status),color)} added only · ${paintDeleted(humanSignedMeasurement('-',report.totals.lines.deleted,report.measurement.status),color)} deleted only · ${paintStrong(humanSignedMeasurement('~',report.totals.lines.modified,report.measurement.status),color)} modified`);
  lines.push('');

  lines.push(paintQuiet(`${padLabel('Raw')}+${humanMeasurement(report.totals.raw.added,report.measurement.status)} additions · -${humanMeasurement(report.totals.raw.deleted,report.measurement.status)} deletions · ${humanMeasurement(report.totals.raw.churn,report.measurement.status)} churn`,color));
  lines.push(paintQuiet(`${padLabel('Files')}${humanFilesLine(report)}`,color));

  const bands=humanBandsLine(report), metrics=humanMetricsLine(report,full), rules=humanRulesLine(report,full);
  if(bands||metrics||rules){
    lines.push('',paintStrong('Policy',color));
    if(bands) lines.push(`  ${padLabel(Object.keys(report.bands??{}).length===1?'Band':'Bands')}${bands}`);
    if(metrics) lines.push(`  ${padLabel('Metrics')}${metrics}`);
    if(rules) lines.push(`  ${padLabel(Object.keys(report.rules??{}).length===1?'Rule':'Rules')}${rules}`);
  }
  if(full) lines.push(...humanReportDetails(report,color));
  return lines.join('\n')+'\n';
}

function reportAgent(report: Report): string {
  const lines=[
    `diffdevil.agent-report/1 schema=${report.schemaVersion}`,
    `semantics ${agentSemantics(report.semantics)}`,
    `source ${agentSource(report.source)}`,
    `identity report=${report.reportId===undefined?'null':JSON.stringify(report.reportId)} policy=${report.policyId===undefined?'null':JSON.stringify(report.policyId)}`,
    `evidence status=${report.measurement.status} file_set=${report.fileSet.complete?'complete':'incomplete'}${report.measurement.reasons.length?` reasons=${JSON.stringify(report.measurement.reasons)}`:''}`,
    `lines changed=${agentMeasurement(report.totals.lines.changed)} modified=${agentMeasurement(report.totals.lines.modified)} added_only=${agentMeasurement(report.totals.lines.added)} deleted_only=${agentMeasurement(report.totals.lines.deleted)}`,
    `raw churn=${agentMeasurement(report.totals.raw.churn)} added=${agentMeasurement(report.totals.raw.added)} deleted=${agentMeasurement(report.totals.raw.deleted)}`,
    `files ${Object.entries(report.totals.files).map(([name,value])=>`${name}=${agentMeasurement(value)}`).join(' ')}`,
  ];
  for(const [name,scope] of Object.entries(report.scopes??{})) lines.push(`scope id=${JSON.stringify(name)} file_set=${scope.fileSet.complete?'complete':'incomplete'} files=${agentMeasurement(scope.fileSet.total)} changed=${agentMeasurement(scope.totals.lines.changed)} raw_churn=${agentMeasurement(scope.totals.raw.churn)}`);
  if(report.metrics&&Object.keys(report.metrics).length) lines.push(`metrics ${Object.entries(report.metrics).map(([name,value])=>`${JSON.stringify(name)}=${agentMeasurement(value)}`).join(' ')}`);
  if(report.bands&&Object.keys(report.bands).length) lines.push(`bands ${Object.entries(report.bands).map(([name,value])=>`${JSON.stringify(name)}=${agentBand(value)}`).join(' ')}`);
  for(const [name,value] of Object.entries(report.rules??{})) lines.push(`rule ${agentRule(name,value)}`);
  return lines.join('\n')+'\n';
}

export function formatReport(report:Report,format:ReportFormat='human',options:TextPresentationOptions={}):Result<Rendered> {
  return formatReportWithOptions(report,format,options);
}

/** Format one canonical report through a presentation-specific projection. */
export function formatReportWithOptions(report:Report,format:ReportFormat='human',options:TextPresentationOptions={}):Result<Rendered> {
  return capture(()=>{
    let stdout:string;
    if(format==='json') stdout=JSON.stringify(report)+'\n';
    else if(format==='jsonl') stdout=[{type:'header',kind:report.kind,schemaVersion:report.schemaVersion,semantics:report.semantics,source:report.source},...report.files.map(file=>({type:'file',file})),{type:'summary',measurement:report.measurement,fileSet:report.fileSet,totals:report.totals,scopes:report.scopes,metrics:report.metrics,metricTypes:report.metricTypes,bands:report.bands,rules:report.rules}].map(x=>JSON.stringify(x)).join('\n')+'\n';
    else if(format==='env') {
      const lines=[`DIFFDEVIL_SCHEMA_VERSION=${report.schemaVersion}`,`DIFFDEVIL_MEASUREMENT_STATUS=${report.measurement.status}`];
      for(const group of ['raw','lines','files'] as const) for(const [name,m] of Object.entries(report.totals[group])) {
        const key=`DIFFDEVIL_${group}_${name}`.toUpperCase(); lines.push(`${key}_STATUS=${m.status}`);
        if(m.status==='exact') lines.push(`${key}=${m.value}`);
        else if(m.status==='bounded'||m.status==='unknown') { if(m.lower!==undefined) lines.push(`${key}_LOWER=${m.lower}`);if(m.upper!==undefined) lines.push(`${key}_UPPER=${m.upper}`); }
      }
      stdout=lines.join('\n')+'\n';
    } else if(format==='markdown') stdout=reportMarkdown(report);
    else if(format==='human') stdout=reportHuman(report,options);
    else if(format==='agent') stdout=reportAgent(report);
    else fail('E_FORMAT_TYPE',`Unsupported report format ${String(format)}.`,'format');
    enforceBytes(stdout,DEFAULT_LIMITS.resultBytes,'Report output','format'); return {stdout,exitCode:0};
  });
}
