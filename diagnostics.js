// ASMRTube local runtime diagnostics — bounded, sanitized, local-only.
(function(){
  'use strict';

  const KEY='asmrtube.diagnostics.v1';
  const MAX_EVENTS=120;
  const startedAt=new Date().toISOString();
  const sessionId=(crypto.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
  let events=[];
  let storageAvailable=true;

  function cleanString(value){
    return String(value??'')
      .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi,'Bearer [redacted]')
      .replace(/(?:api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi,'$1=[redacted]')
      .slice(0,240);
  }
  function cleanValue(value,depth=0){
    if(depth>2)return '[depth-limit]';
    if(value==null||typeof value==='boolean'||typeof value==='number')return value;
    if(typeof value==='string')return cleanString(value);
    if(Array.isArray(value))return value.slice(0,12).map(item=>cleanValue(item,depth+1));
    if(typeof value==='object'){
      const out={};
      for(const [key,item] of Object.entries(value).slice(0,20)){
        if(/authorization|cookie|password|token|secret|body|content|input|query|fragment/i.test(key))continue;
        out[key]=cleanValue(item,depth+1);
      }
      return out;
    }
    return cleanString(value);
  }
  function load(){
    try{
      const parsed=JSON.parse(localStorage.getItem(KEY)||'[]');
      events=Array.isArray(parsed)?parsed.slice(-MAX_EVENTS):[];
    }catch{storageAvailable=false;events=[]}
  }
  function persist(){
    if(!storageAvailable)return false;
    try{localStorage.setItem(KEY,JSON.stringify(events.slice(-MAX_EVENTS)));return true}
    catch{storageAvailable=false;return false}
  }
  function record(type,detail={}){
    events.push({at:new Date().toISOString(),sessionId,type:cleanString(type),detail:cleanValue(detail)});
    if(events.length>MAX_EVENTS)events=events.slice(-MAX_EVENTS);
    persist();
  }
  function context(){
    const config=window.ASMRTUBE_CONFIG||{};
    return {
      appVersion:config.appVersion||null,
      build:config.build||null,
      schemaVersion:config.schemaVersion||null,
      startedAt,
      capturedAt:new Date().toISOString(),
      path:location.pathname,
      viewport:{width:window.innerWidth,height:window.innerHeight,dpr:window.devicePixelRatio||1},
      platform:navigator.platform||'',
      userAgent:cleanString(navigator.userAgent||''),
      online:navigator.onLine,
      storageAvailable
    };
  }
  function snapshot(){return {context:context(),events:[...events]}}
  function exportJson(){
    const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download=`asmrtube_diagnostics_${new Date().toISOString().slice(0,10)}.json`;anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  function clear(){
    events=[];
    try{localStorage.removeItem(KEY);storageAvailable=true;return true}catch{return false}
  }
  function summary(){
    return {
      events:events.length,
      errors:events.filter(event=>/error|failure|rejection/i.test(event.type)).length,
      storageAvailable
    };
  }

  load();
  record('session.start',{path:location.pathname});
  window.addEventListener('error',event=>record('javascript.error',{message:event.message,source:event.filename?.split('/').pop()||'',line:event.lineno,column:event.colno}));
  window.addEventListener('unhandledrejection',event=>record('promise.rejection',{message:event.reason?.message||String(event.reason||'unknown')}));
  window.addEventListener('online',()=>record('network.online'));
  window.addEventListener('offline',()=>record('network.offline'));

  window.asmrtubeDiagnostics=Object.freeze({record,snapshot,exportJson,clear,summary});
})();
