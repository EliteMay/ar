// ASMRTube v3 — appearance, dedicated settings page and media ambience.
(function(){
  'use strict';

  const SETTINGS_KEY='asmrtube.settings.v1';
  const THEMES={
    violet:{label:'Moon Violet',themeColor:'#0b0911'},
    rose:{label:'Soft Rose',themeColor:'#10090d'},
    ocean:{label:'Deep Ocean',themeColor:'#07101a'},
    forest:{label:'Quiet Forest',themeColor:'#07110e'},
    amber:{label:'Warm Lamp',themeColor:'#120d08'},
    graphite:{label:'Graphite',themeColor:'#0a0b0d'}
  };
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];

  let settings={
    theme:'violet',
    brightness:100,
    compact:false,
    showThumbs:true,
    reduceMotion:false,
    startDashboard:false
  };

  try{settings={...settings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{}

  function saveSettings(){
    try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch{}
  }

  function ensureDimmer(){
    let dimmer=$('#screenDimmer');
    if(dimmer)return dimmer;
    dimmer=document.createElement('div');
    dimmer.id='screenDimmer';
    dimmer.setAttribute('aria-hidden','true');
    document.body.appendChild(dimmer);
    return dimmer;
  }

  function syncControls(){
    $$('[data-theme-choice]').forEach(button=>{
      const active=button.dataset.themeChoice===settings.theme;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
      button.setAttribute('aria-label',`${button.querySelector('strong')?.textContent||'テーマ'}${active?'（選択中）':''}`);
    });

    const brightness=$('#appearanceBrightness');
    if(brightness)brightness.value=String(settings.brightness);
    const brightnessValue=$('#appearanceBrightnessValue');
    if(brightnessValue)brightnessValue.textContent=`${settings.brightness}%`;
    $$('[data-appearance-brightness]').forEach(button=>button.classList.toggle('active',Number(button.dataset.appearanceBrightness)===Number(settings.brightness)));

    const pairs={
      appearanceCompact:'compact',
      appearanceThumbs:'showThumbs',
      appearanceMotion:'reduceMotion',
      appearanceDashboard:'startDashboard'
    };
    Object.entries(pairs).forEach(([id,key])=>{
      const input=$(`#${id}`);
      if(input)input.checked=!!settings[key];
    });

    const currentTheme=$('#currentThemeName');
    if(currentTheme)currentTheme.textContent=THEMES[settings.theme]?.label||THEMES.violet.label;
  }

  function applyAppearance({save=true}={}){
    const theme=THEMES[settings.theme]?settings.theme:'violet';
    const brightness=Math.max(30,Math.min(100,Number(settings.brightness)||100));
    settings.theme=theme;
    settings.brightness=brightness;

    document.documentElement.dataset.theme=theme;
    document.documentElement.dataset.compact=settings.compact?'1':'0';
    document.documentElement.dataset.thumbs=settings.showThumbs?'1':'0';
    document.documentElement.dataset.reduceMotion=settings.reduceMotion?'1':'0';
    document.body.dataset.theme=theme;

    ensureDimmer().style.opacity=String((100-brightness)/100);
    const themeMeta=$('meta[name="theme-color"]');
    if(themeMeta)themeMeta.setAttribute('content',THEMES[theme].themeColor);

    syncControls();
    if(save)saveSettings();
    document.dispatchEvent(new CustomEvent('asmrtube:appearance-change',{detail:{...settings}}));
  }

  function cleanupLegacyHeaderControls(){
    // v2 Product Shell injected these into the brand row. v3 has a dedicated
    // settings page and Help inside it, so leaving both routes visible makes
    // the primary navigation noisy. The dialogs themselves remain available.
    $('#settingsBtn')?.remove();
    $('#helpBtn')?.remove();
  }

  function showSettings(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    try{window.asmrtubeProductShell?.hideDashboard?.()}catch{}
    const page=$('#settingsPage');
    if(!page)return;
    document.body.classList.remove('mobile-sidebar-open');
    document.body.classList.add('settings-mode');
    page.hidden=false;
    $('#settingsPageBtn')?.classList.add('active');
    syncControls();
    window.scrollTo?.(0,0);
  }

  function hideSettings(){
    const page=$('#settingsPage');
    document.body.classList.remove('settings-mode');
    $('#settingsPageBtn')?.classList.remove('active');
    if(page)page.hidden=true;
  }

  function bindSettingsTriggers(){
    const button=$('#settingsPageBtn');
    if(button&&!button.dataset.v3Bound){
      button.dataset.v3Bound='1';
      button.addEventListener('click',showSettings);
    }
    const back=$('#settingsBackBtn');
    if(back&&!back.dataset.v3Bound){
      back.dataset.v3Bound='1';
      back.addEventListener('click',hideSettings);
    }
  }

  function bindControls(){
    $$('[data-theme-choice]').forEach(button=>button.addEventListener('click',()=>{
      const theme=button.dataset.themeChoice;
      if(!THEMES[theme])return;
      settings.theme=theme;
      applyAppearance();
    }));

    $('#appearanceBrightness')?.addEventListener('input',event=>{
      settings.brightness=Number(event.target.value);
      applyAppearance();
    });

    $$('[data-appearance-brightness]').forEach(button=>button.addEventListener('click',()=>{
      settings.brightness=Number(button.dataset.appearanceBrightness);
      applyAppearance();
    }));

    const pairs={
      appearanceCompact:'compact',
      appearanceThumbs:'showThumbs',
      appearanceMotion:'reduceMotion',
      appearanceDashboard:'startDashboard'
    };
    Object.entries(pairs).forEach(([id,key])=>$('#'+id)?.addEventListener('change',event=>{
      settings[key]=event.target.checked;
      applyAppearance();
    }));

    $('#settingsDataBtn')?.addEventListener('click',()=>{
      try{window.asmrtubeProductShell?.refreshDataDialog?.()}catch{}
      const dialog=$('#dataDialog');
      if(dialog?.showModal)dialog.showModal();
      else $('#exportBtn')?.focus();
    });

    $('#settingsHelpBtnV3')?.addEventListener('click',()=>{
      const dialog=$('#helpDialog');
      if(dialog?.showModal)dialog.showModal();
      else toast?.('ヘルプを準備できませんでした');
    });
  }

  function syncMediaArt(){
    let item=null;
    try{item=typeof itemById==='function'?itemById(state.selectedId):null}catch{}
    const id=String(item?.videoId||'').replace(/[^\w-]/g,'');
    if(!id){
      document.documentElement.style.setProperty('--media-art','none');
      document.documentElement.dataset.hasMediaArt='0';
      return;
    }
    document.documentElement.style.setProperty('--media-art',`url("https://i.ytimg.com/vi/${id}/hqdefault.jpg")`);
    document.documentElement.dataset.hasMediaArt='1';
  }

  function bindWorkspaceExit(){
    document.addEventListener('click',event=>{
      if(!document.body.classList.contains('settings-mode'))return;
      if(event.target.closest('.song-item,.playlist-item,.view-btn,#dashboardBtn,#topAddBtn,#addVideoBtn'))hideSettings();
    },true);
  }

  applyAppearance({save:false});
  cleanupLegacyHeaderControls();
  bindSettingsTriggers();
  bindControls();
  bindWorkspaceExit();
  syncMediaArt();

  const title=$('#nowTitle');
  if(title)new MutationObserver(syncMediaArt).observe(title,{childList:true,characterData:true,subtree:true});

  // Compatibility shell may insert its old brand controls after this module in
  // a future load-order change. Keep the v3 navigation canonical.
  const shellObserver=new MutationObserver(()=>{
    cleanupLegacyHeaderControls();
    bindSettingsTriggers();
  });
  shellObserver.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>shellObserver.disconnect(),8000);

  window.asmrtubeAppearance={showSettings,hideSettings,applyAppearance,getSettings:()=>({...settings})};
})();
