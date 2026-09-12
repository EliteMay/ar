import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd());
const failures=[];

function fail(message){failures.push(message)}
function exists(relative){return fs.existsSync(path.join(root,relative))}
function read(relative){return fs.readFileSync(path.join(root,relative),'utf8')}

const html=read('index.html');
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
  'youtube-runtime.js',
  'app-quality-v21.js',
  'ui-enhancements.js',
  'appearance.js',
  'library-tools-v22.js',
  'timestamp-parser.js',
  'timestamp-ui.js',
  'timestamp-polish-v21.js',
  'styles.css',
  'asmr-overrides.css',
  'ui-base-v2.css',
  'product-v2.css',
  'timestamp-ui.css',
  'quality-v21.css',
  'library-tools-v22.css',
  'theme.css',
  'workspace.css',
  'settings.css',
  'project-meta.json',
  'README.md',
  'PROJECT_LEARNINGS.md',
  'docs/VISUAL_BASELINE.md',
  '作業報告書.md'
];
for(const file of required)if(!exists(file))fail(`required file is missing: ${file}`);

const meta=JSON.parse(read('project-meta.json'));
const configSource=read('app-config.js');
const runtimeSource=read('youtube-runtime.js');
const appearanceSource=read('appearance.js');
const timestampUiSource=read('timestamp-ui.js');
function configString(key){return configSource.match(new RegExp(`${key}:\\s*['\"]([^'\"]+)['\"]`))?.[1]||null}
function configNumber(key){const value=configSource.match(new RegExp(`${key}:\\s*(\\d+)`))?.[1];return value==null?null:Number(value)}

if(configString('appVersion')!==meta.appVersion)fail(`appVersion mismatch: app-config.js=${configString('appVersion')} project-meta.json=${meta.appVersion}`);
if(configString('guideVersion')!==meta.guideVersion)fail(`guideVersion mismatch: app-config.js=${configString('guideVersion')} project-meta.json=${meta.guideVersion}`);
if(configNumber('schemaVersion')!==meta.schemaVersion)fail(`schemaVersion mismatch: app-config.js=${configNumber('schemaVersion')} project-meta.json=${meta.schemaVersion}`);
if(!html.includes(`<title>ASMRTube v${meta.appVersion}</title>`))fail(`index.html title does not match appVersion ${meta.appVersion}`);

const requiredRuntime=[
  'app-config.js?v=3.0',
  'app.js?v=3',
  'timestamp-parser.js?v=1.9',
  'timestamp-ui.js?v=3.0',
  'ui-enhancements.js?v=3.0',
  'app-quality-v21.js?v=2.1',
  'timestamp-polish-v21.js?v=2.1',
  'library-tools-v22.js?v=2.2',
  'appearance.js?v=3.0'
];
for(const ref of requiredRuntime)if(!html.includes(ref))fail(`required runtime is not connected: ${ref}`);

const requiredVisual=[
  'timestamp-ui.css?v=3.0',
  'library-tools-v22.css?v=2.2',
  'theme.css?v=3.0',
  'workspace.css?v=3.0',
  'settings.css?v=3.0'
];
for(const ref of requiredVisual)if(!html.includes(ref))fail(`required visual layer is not connected: ${ref}`);

const indexOf=value=>html.indexOf(value);
const productIndex=indexOf('product-v2.css');
const libraryCssIndex=indexOf('library-tools-v22.css');
const themeIndex=indexOf('theme.css?v=3.0');
const workspaceIndex=indexOf('workspace.css?v=3.0');
const settingsCssIndex=indexOf('settings.css?v=3.0');
if(themeIndex<0||themeIndex<productIndex||themeIndex<libraryCssIndex)fail('theme.css must load after legacy/product/library CSS');
if(workspaceIndex<themeIndex)fail('workspace.css must load after theme.css');
if(settingsCssIndex<workspaceIndex)fail('settings.css must load after workspace.css');

const parserIndex=indexOf('timestamp-parser.js?v=1.9');
const timestampUiIndex=indexOf('timestamp-ui.js?v=3.0');
const productShellIndex=indexOf('ui-enhancements.js?v=3.0');
const appearanceIndex=indexOf('appearance.js?v=3.0');
if(timestampUiIndex<parserIndex)fail('timestamp-ui.js must load after timestamp-parser.js');
if(productShellIndex<timestampUiIndex)fail('ui-enhancements.js must load after canonical timestamp UI');
if(appearanceIndex<productShellIndex)fail('appearance.js must load after product shell so the settings gear routes to the v3 page');

if(html.includes('https://www.youtube.com/iframe_api'))fail('YouTube IFrame API must not be an eager index.html dependency');
if(!configSource.includes("script.src='youtube-runtime.js?v=3.0.1'"))fail('app-config.js must defer the YouTube reliability runtime until app startup completes');
if(configSource.includes('new MutationObserver'))fail('app-config.js must not use a DOM MutationObserver during parser startup; version application must be one-shot');
if(!configSource.includes("document.addEventListener('DOMContentLoaded',start,{once:true})"))fail('app-config.js must wait for DOMContentLoaded before startup wiring');
if(!runtimeSource.includes("script.src='https://www.youtube.com/iframe_api'"))fail('youtube-runtime.js must load YouTube IFrame API on demand');
if(!runtimeSource.includes('function ensurePlayer()'))fail('youtube-runtime.js must isolate YouTube player initialization');
if(!runtimeSource.includes("showPlayerStatus('YouTubeプレイヤーを読み込めませんでした'"))fail('YouTube player failure needs an inline recoverable state');
if(!runtimeSource.includes('if(!uiTimer)uiTimer=setInterval(updatePlayerUi,400)'))fail('player UI interval must be guarded against duplication');
if(!runtimeSource.includes('playItem=async function'))fail('playback must be routed through the lazy player runtime');

if(!html.includes('id="settingsPage"'))fail('dedicated settings page is missing');
if(!html.includes('id="settingsPageBtn"'))fail('settings page navigation button is missing');
const themeChoices=[...html.matchAll(/data-theme-choice="([^"]+)"/g)].map(match=>match[1]);
if(themeChoices.length<5)fail(`settings page needs multiple color themes; found ${themeChoices.length}`);
if(new Set(themeChoices).size!==themeChoices.length)fail('theme choices contain duplicate ids');

if(!appearanceSource.includes("const SETTINGS_KEY='asmrtube.settings.v1'"))fail('appearance settings must keep asmrtube.settings.v1');
if(!appearanceSource.includes("theme:'violet'"))fail('appearance defaults must include a theme');
if(!timestampUiSource.includes('window.renderTimestamps=renderTimestampsV3'))fail('canonical timestamp UI is not connected to global renderTimestamps');
if(!timestampUiSource.includes('window.updateActiveTimestamp=updateActive'))fail('canonical timestamp UI is not connected to player highlighting');

if(failures.length){
  console.error('\nASMRTube static check failed:\n');
  failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}

console.log(`ASMRTube static check passed: ${refs.length} HTML references checked, JSON parsed, metadata aligned, startup observer guard, deferred YouTube runtime and v3 visual layers connected.`);
