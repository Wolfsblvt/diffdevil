import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileBands, resolveBand } from '../../../dist/lib/policy/bands.js';
import { compileTemplate, renderTemplate, escapeMarkdown, commentLifecycle } from '../../../dist/lib/policy/templates.js';
import { decodeStringLiteral } from '../../../dist/lib/language/strings.js';
import { ast } from '../../../dist/lib/language/ast.js';
import { compileAst } from '../../../dist/lib/language/compile.js';
import { environmentFromReport, createEnvironment } from '../../../dist/lib/language/environment.js';
import { recordType } from '../../../dist/lib/language/types.js';
import { textValue, recordValue } from '../../../dist/lib/language/values.js';
import { readReport } from '../../../dist/lib/report.js';
import { unwrap } from '../../../dist/lib/errors.js';

const data = name => JSON.parse(readFileSync(new URL(`../../../src/diffdevil/contracts/detail/v1/conformance/${name}.json`, import.meta.url))).cases;
const report = name => JSON.parse(readFileSync(new URL(`../../../docs/examples/reports/${name}.json`, import.meta.url)));
const ranges = [{id:'xs',lt:20},{id:'s',lt:100},{id:'m',lt:500},{id:'l',lt:1000},{id:'xl',otherwise:true}];
const size = unwrap(compileBands({minimum:0,ranges}));
const error = (result, code) => {assert.equal(result.ok,false);assert.equal(result.diagnostics[0].code,code);};
for (const row of data('bands')) test(`conformance bands / ${row.id}`, () => {
 const result = resolveBand(size,row.input);
 if(row.expect.error){error(result,row.expect.error);return;}
 const actual=unwrap(result);
 for(const [key,value] of Object.entries(row.expect))assert.deepEqual(actual[key],value);
});
for (const row of data('band-invalid')) test(`conformance band-invalid / ${row.id}`, () => error(compileBands({ranges:row.ranges}),row.code));
for (const row of data('templates')) test(`conformance templates / ${row.id}`, () => {
 const environment=unwrap(environmentFromReport(report(row.environment.replace('report-',''))));
 const compiled=compileTemplate(row.template,environment.schema);
 if(row.error){error(compiled,row.error);return;}
 assert.equal(unwrap(renderTemplate(unwrap(compiled),environment)),row.expect);
});

test('bands preserve the domain proof and distinguish partial violation from unknown floor', () => {
 error(resolveBand(size,{status:'bounded',lower:-1,upper:10}),'E_POSSIBLE_DOMAIN');
 error(resolveBand(size,{status:'unknown',upper:-1,reasons:[{code:'INSUFFICIENT_EVIDENCE'}]}),'E_BAND_DOMAIN');
 const unresolved=unwrap(resolveBand(size,{status:'unknown',upper:10,reasons:[{code:'INSUFFICIENT_EVIDENCE'}]}));
 assert.equal(unresolved.status,'unknown');assert.equal(unresolved.reasons.at(-1).code,'BAND_DOMAIN_UNPROVEN');
 const signed=unwrap(compileBands({ranges:[{id:'negative',lt:0},{id:'positive',otherwise:true}]}));
 assert.equal(unwrap(resolveBand(signed,{status:'exact',value:-9})).id,'negative');
 error(compileBands({minimum:100,ranges}),'E_BAND_ORDER');
 error(compileBands({ranges:[{id:'a',lt:Infinity},{id:'b',otherwise:true}]}),'E_CONFIG');
 error(resolveBand({}, {status:'exact',value:1}),'E_PROGRAM');
});
test('templates escape substituted data, preserve authored Markdown, and parse quoted closing braces',()=>{
 const environment=unwrap(createEnvironment({params:recordType({name:'string','a}}b':'string'})},{params:recordValue({name:textValue('<script>@team **x** [a](b) `'), 'a}}b':textValue('found')})}));
 const render=text=>unwrap(renderTemplate(unwrap(compileTemplate(text,environment.schema)),environment));
 assert.equal(render('**Name:** {{ params.name }}'),'**Name:** '+escapeMarkdown('<script>@team **x** [a](b) `'));
 assert.equal(render('{{ params["a}}b"] | text }}'),'found');
 assert.equal(render('{{ params.name | text }}'),'<script>@team **x** [a](b) `');
 assert.equal(render('\\{{ params.name }}'),'{{ params.name }}');
 assert.equal(render('\\\\{{ params["a}}b"] }}'),'\\found');
 assert.match(render('{{ params | json }}'),/```json\n\{/);
 error(compileTemplate('{{ params.name | unknown }}',environment.schema),'E_TEMPLATE_FORMAT');
 error(compileTemplate('{{ params.name ',environment.schema),'E_TEMPLATE_PLACEHOLDER');
 error(compileTemplate('{{ params }}',environment.schema),'E_TEMPLATE_FORMAT');
});
test('template programs cannot be forged or evaluated under a different schema',()=>{
 const environment=unwrap(environmentFromReport(report('exact')));
 error(renderTemplate({},environment),'E_PROGRAM');
 const program=unwrap(compileTemplate('{{metrics.review}}',environment.schema));
 error(renderTemplate(program,unwrap(createEnvironment({},{}))),'E_ENVIRONMENT_SCHEMA');
});
test('comment lifecycle defaults and incompatible transitions are explicit',()=>{
 assert.deepEqual(commentLifecycle(undefined,undefined,'boolean'),{mode:'upsert',trigger:'matched'});
 assert.deepEqual(commentLifecycle(undefined,undefined,'band'),{mode:'upsert',trigger:'band-changed'});
 assert.deepEqual(commentLifecycle('once-per-transition','matched','boolean'),{mode:'once-per-transition',trigger:'matched'});
 for(const args of [['upsert','band-changed','boolean'],['once-per-transition','always','boolean'],['once-per-transition','matched','band'],['execute','always','band']])assert.throws(()=>commentLifecycle(...args),e=>e.diagnostic.code==='E_CONFIG');
});
test('string decoding and typed input reject lone or escape-split Unicode surrogates',()=>{
 assert.equal(decodeStringLiteral('"A\\uD83D\\uDE00"'),'A😀');
 assert.equal(decodeStringLiteral("'a\\n\\t\\\\\\\"'"),'a\n\t\\"');
 assert.equal(decodeStringLiteral('"😀"'),'😀');
 for(const raw of ['"\\uD83D"','"\\uDE00"','"\ud83d\\uDE00"','"\\uD83D\ude00"','"\\q"','"\\u012"','"a\nb"'])assert.throws(()=>decodeStringLiteral(raw),e=>e.diagnostic.code==='E_STRING_ESCAPE');
 error(createEnvironment({params:recordType({s:'string'})},{params:recordValue({s:textValue('\ud83d')})}),'E_INPUT');
 error(compileAst(ast.literal('\ud83d'),{environment:{}}),'E_AST');
});
test('saved reports validate band and rule payloads before they reach template roots',()=>{
 const original=report('exact');
 for(const band of [{status:'resolved',id:''},{status:'resolved',id:'s',lower:20,upper:20},{status:'resolved',id:'s',upper:Infinity},{status:'unknown',id:'s',candidates:['s'],reasons:[{code:'X'}]},{status:'unknown',candidates:['s','s'],reasons:[{code:'X'}]},{status:'unknown',candidates:['s'],reasons:[]}])error(readReport({...original,bands:{size:band}}),'E_REPORT_INVALID');
 for(const rule of [{disposition:'unknown'},{disposition:'held',decision:{status:'unknown',value:false,reasons:[{code:'X'}]}},{disposition:'matched',decision:{status:'resolved',value:0}},{disposition:'matched',band:{status:'resolved',id:''}}])error(readReport({...original,rules:{size:rule}}),'E_REPORT_INVALID');
 const valid={status:'unknown',candidates:['m','l'],reasons:[{code:'BAND_UNRESOLVED'}]};
 assert.deepEqual(unwrap(readReport({...original,bands:{size:valid}})).bands.size,valid);
});

test('an unresolved band keeps its ID structurally absent in the typed environment',()=>{
 const raw=report('exact');raw.bands={size:{status:'unknown',candidates:['m','l'],reasons:[{code:'BAND_UNRESOLVED'}]}};
 const env=unwrap(environmentFromReport(raw));
 assert.equal(env.values.bands.fields.size.fields.id.kind,'missing');
 const template=unwrap(compileTemplate('Band={{bands.size}} ID={{bands.size.id}}',env.schema));
 assert.equal(unwrap(renderTemplate(template,env)),'Band=unknown ID=not available');
 error(readReport({...raw,metrics:{'':{status:'exact',value:1}},metricTypes:{'':'integer'}}),'E_REPORT_INVALID');
});
