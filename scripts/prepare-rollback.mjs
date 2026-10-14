import {execFileSync} from 'node:child_process';
import {mkdir, readFile, writeFile, copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const revision='5f68b82103535ec09f97a381658eaa35e5ecf7b2';
const target=resolve(process.argv[2]??'/tmp/umc-safe-rollback');
// Must be new: never overwrite a checkout, user files or a previous artifact.
await mkdir(target);
const archive=execFileSync('git',['archive',revision],{cwd:root,maxBuffer:100*1024*1024});
execFileSync('tar',['-x','-C',target],{input:archive});
async function edit(path,from,to){const file=resolve(target,path),text=await readFile(file,'utf8');if(!text.includes(from))throw new Error(`Historical patch anchor missing: ${path}`);await writeFile(file,text.replace(from,to));}
await copyFile(resolve(root,'scripts/rollback/rollback-guard.ts'),resolve(target,'src/app/rollback-guard.ts'));
await edit('src/app/saved-scenarios.ts',"import {validateUniqueIdentifiers}","import {requirePreservedFields} from './rollback-guard';\nimport {validateUniqueIdentifiers}");
await edit('src/app/saved-scenarios.ts',' return {version:1,id:value.id',' const result:SavedScenario = {version:1,id:value.id');
await edit('src/app/saved-scenarios.ts',"\n}\nexport function readLibrary", "\n if(value.voyageStage!==undefined)throw new Error('This plan requires a newer simulator (voyage stages). It was not loaded. Keep the original backup.');\n requirePreservedFields(s,result.state);\n return result;\n}\nexport function readLibrary");
await edit('src/app/saved-scenarios.ts',' const s=value.state;'," const s=value.state;\n if(object(s)&&Array.isArray(s.weights)&&s.weights.length>10000)throw new Error('This rollback build supports at most 10,000 weights. Open this plan in the current version. It was not loaded.');");
for(const file of ['src/components/cargo-plans.tsx','src/components/saved-scenarios.tsx'])await edit(file,'Some saved records could not be read. They were retained; other plans and recovery remain available.','Some saved records require a newer simulator or could not be read. They remain unchanged in storage. Return to the current version to open them.');
await edit('src/main.tsx','<LanguageProvider><App /></LanguageProvider>',`<LanguageProvider><aside role="note" style={{padding:'12px',background:'#fff2cc',color:'#302600'}}>Rollback compatibility build · Older functionality. Newer plans may be refused to protect their inputs. Keep original backups and return to the current version for unsupported plans.<br/>Versiune de revenire · Funcții mai vechi. Planurile noi pot fi refuzate pentru a proteja datele. Păstrați copiile originale.</aside><App /></LanguageProvider>`);
const lockPath=resolve(target,'package-lock.json'),lock=JSON.parse(await readFile(lockPath,'utf8'));
const current=JSON.parse(await readFile(resolve(root,'package-lock.json'),'utf8'));
lock.packages['node_modules/source-map-js']=current.packages['node_modules/source-map-js'];
await writeFile(lockPath,JSON.stringify(lock,null,2)+'\n');
for(const file of ['release-tools.mjs','release-notices.mjs'])await copyFile(resolve(root,'scripts',file),resolve(target,'scripts',file));
await writeFile(resolve(target,'rollback-build.json'),JSON.stringify({baseRevision:revision,mode:'reject-unsupported-inputs',notAcceptedForDeployment:true},null,2)+'\n');
console.log(target);
