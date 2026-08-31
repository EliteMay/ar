// ASMRTube application metadata — single source of truth.
(function(){
  'use strict';

  const config=Object.freeze({
    appVersion:'2.4.0',
    build:'20260831-1',
    schemaVersion:1,
    guideVersion:'1.11.0',
    profiles:Object.freeze(['STATIC','DATA','MEDIA','TOOL'])
  });

  window.ASMRTUBE_CONFIG=config;

  function applyVersion(){
    document.documentElement.dataset.appVersion=config.appVersion;
    document.documentElement.dataset.build=config.build;
    document.title=`ASMRTube v${config.appVersion}`;
    const badge=document.querySelector('.sidebar-version strong');
    if(badge)badge.textContent=`v${config.appVersion}`;
    return !!badge;
  }

  window.applyAsmrtubeVersion=applyVersion;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyVersion,{once:true});
  else applyVersion();

  // Compatibility bridge for the product shell, which creates the sidebar badge after this file loads.
  const observer=new MutationObserver(()=>{
    if(applyVersion())observer.disconnect();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),10000);
})();