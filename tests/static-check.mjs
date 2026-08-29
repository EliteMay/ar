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
  'README.md',
  '作業報告書.md'
];
for(const file of required)if(!exists(file))fail(`required file is missing: ${file}`);

if(!/ASMRTube v2\.2/.test(html))fail('index.html version title is not v2.2');
if(!html.includes('library-tools-v22.js?v=2.2'))fail('v2.2 JavaScript is not connected');
if(!html.includes('library-tools-v22.css?v=2.2'))fail('v2.2 CSS is not connected');

if(failures.length){
  console.error('\nASMRTube static check failed:\n');
  failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}

console.log(`ASMRTube static check passed: ${refs.length} HTML references checked, JSON files parsed, required files present.`);
