// ASMRTube application metadata — single source of truth.
(function(){
  'use strict';

  const config=Object.freeze({
    appVersion:'3.0.0',
    build:'20260909-1',
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

  function loadReliabilityRuntime(){
    if(document.querySelector('script[data-asmrtube-youtube-runtime]'))return;
    const script=document.createElement('script');
    script.src='youtube-runtime.js?v=3.0.1';
    script.async=false;
    script.dataset.asmrtubeYoutubeRuntime='1';
    script.addEventListener('error',()=>console.error('ASMRTube: youtube-runtime.js failed to load'),{once:true});
    document.body.appendChild(script);
  }

  window.applyAsmrtubeVersion=applyVersion;

  const start=()=>{
    applyVersion();
    // app.js is parser-loaded later in index.html. Queue this so the reliability
    // patch runs only after the base runtime has installed its globals/handlers.
    setTimeout(loadReliabilityRuntime,0);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  const observer=new MutationObserver(()=>{
    if(applyVersion())observer.disconnect();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),10000);
})();