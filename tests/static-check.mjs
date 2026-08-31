import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd());
const failures=[];

function fail(message){failures.push(message)}
function exists(relative){return fs.existsSync(path.join(root,relative))}

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
for(const ref of refs){
  if(/^(?:https?:|data:|#)/i.test(ref))continue;
  const clean=ref.split(/[?#]/)[0].replace(/^\.\//,'');
  if(clean&&!exists(clean))fail(`index.html reference is missing: ${clean}`);
}

function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name==='.git'||entry.name==='node_modules')continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(entry.name.endsWith('.json')){
      try{JSON.parse(fs.readFileSync(full,'utf8'))}
      catch(error){fail(`invalid JSON: ${path.relative(root,full)} (${error.message})`)}
    }
  }
}
walk(root);

const required=[
  'app-config.js',
  'app.js',
  'app-quality-v21.js',
  'ui-enhancements.js',
  'library-tools-v22.js',
  'timestamp-parser.js',
  'timestamp-ui.js',
  'timestamp-polish-v21.js',
  'styles.css',
  'asmr-overrides.css',
  'ui-base-v2.css',
  'product-v2.css',
  'quality-v21.css',
  'library-tools-v22.css',
  'workspace.css',
  'project-meta.json',
  'README.md',
  'PROJECT_LEARNINGS.md',
  '作業報告書.md'
];
for(const file of required)if(!exists(file))fail(`required file is missing: ${file}`);

const meta=JSON.parse(fs.readFileSync(path.join(root,'project-meta.json'),'utf8'));
const configSource=fs.readFileSync(path.join(root,'app-config.js'),'utf8');
function configString(key){return configSource.match(new RegExp(`${key}:\\s*['\"]([^'\"]+)['\"]`))?.[1]||null}
function configNumber(key){const value=configSource.match(new RegExp(`${key}:\\s*(\\d+)`))?.[1];return value==null?null:Number(value)}

if(configString('appVersion')!==meta.appVersion)fail(`appVersion mismatch: app-config.js=${configString('appVersion')} project-meta.json=${meta.appVersion}`);
if(configString('guideVersion')!==meta.guideVersion)fail(`guideVersion mismatch: app-config.js=${configString('guideVersion')} project-meta.json=${meta.guideVersion}`);
if(configNumber('schemaVersion')!==meta.schemaVersion)fail(`schemaVersion mismatch: app-config.js=${configNumber('schemaVersion')} project-meta.json=${meta.schemaVersion}`);
if(!html.includes(`<title>ASMRTube v${meta.appVersion}</title>`))fail(`index.html title does not match appVersion ${meta.appVersion}`);

if(!html.includes('library-tools-v22.js?v=2.2'))fail('v2.2 library tools JavaScript is not connected');
if(!html.includes('library-tools-v22.css?v=2.2'))fail('v2.2 library tools CSS is not connected');
if(!html.includes('workspace.css?v=2.4'))fail('canonical v2.4 workspace CSS is not connected');

const productIndex=html.indexOf('product-v2.css');
const libraryIndex=html.indexOf('library-tools-v22.css');
const workspaceIndex=html.indexOf('workspace.css?v=2.4');
if(workspaceIndex<0||workspaceIndex<productIndex||workspaceIndex<libraryIndex){
  fail('workspace.css must load after legacy/product/library visual layers');
}

if(failures.length){
  console.error('\nASMRTube static check failed:\n');
  failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}

console.log(`ASMRTube static check passed: ${refs.length} HTML references checked, JSON files parsed, metadata aligned, canonical workspace connected.`);
