#!/usr/bin/env node
import { runCli, formatDiagnostic } from './run.js';
const args=process.argv.slice(2);
const result=await runCli(args);
process.stdout.on('error',error=>{process.stderr.write(`E_OUTPUT: ${error.message}\n`);process.exitCode=2;});
if(result.ok){process.exitCode=result.value.exitCode;if(result.value.stdout)process.stdout.write(result.value.stdout);}
else{
  const json=args.includes('--diagnostics=json')||args.some((arg,index)=>arg==='--diagnostics'&&args[index+1]==='json');
  for(const diagnostic of result.diagnostics)process.stderr.write(formatDiagnostic(diagnostic,json));
  process.exitCode=result.diagnostics.some(d=>d.code==='E_RESULT_UNRESOLVED')?3:2;
}
