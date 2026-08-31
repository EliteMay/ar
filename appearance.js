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

  try{
    settings={...settings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};
  }catch{}

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

    const dimmer=ensureDimmer();
    dimmer.style.opacity=String((100-brightness)/100);

    const themeMeta=$('meta[name="theme-color"]');
    if(themeMeta)themeMeta.setAttribute('content',THEMES[theme].themeColor);

    syncControls();
    if(save)saveSettings();
    document.dispatchEvent(new CustomEvent('asmrtube:appearance-change',{detail:{...settings}}));
  }

  function syncControls(){
    $$('[data-theme-choice]').forEach(button=>{
      const active=button.dataset.themeChoice===settings.theme;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
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

  function showSettings(event){
    if(event){
      event.preventDefault();
      event.stopImmediatePropagation?.();
      event.stopPropagation?.();
    }
    try{window.asmrtubeProductShell?.hideDashboard?.()}catch{}
    const page=$('#settingsPage');
    if(!page)return;
    document.body.classList.remove('mobile-sidebar-open');
    document.body.classList.add('settings-mode');
    page.hidden=false;
    $('#settingsPageBtn')?.classList.add('active');
    syncControls();
    window.scrollTo?.({top:0,behavior:'instant'});
  }

  function hideSettings(){
    const page=$('#settingsPage');
    document.body.classList.remove('settings-mode');
    $('#settingsPageBtn')?.classList.remove('active');
    if(page)page.hidden=true;
  }

  function bindSettingsTriggers(){
    $('#settingsPageBtn')?.addEventListener('click',showSettings);
    $('#settingsBackBtn')?.addEventListener('click',hideSettings);

    // Product Shell v2 created a settings dialog. The visible gear is retained,
    // but v3 routes it to the dedicated page instead of the legacy dialog.
    const gear=$('#settingsBtn');
    if(gear&&!gear.dataset.v3Settings){
      gear.dataset.v3Settings='1';
      gear.addEventListener('click',showSettings,true);
      gear.title='設定ページ';
      gear.setAttribute('aria-label','設定ページを開く');
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
      else $('#helpBtn')?.click();
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
  bindSettingsTriggers();
  bindControls();
  bindWorkspaceExit();
  syncMediaArt();

  const title=$('#nowTitle');
  if(title)new MutationObserver(syncMediaArt).observe(title,{childList:true,characterData:true,subtree:true});

  // ui-enhancements.js is allowed to create the gear slightly later in future refactors.
  const shellObserver=new MutationObserver(()=>bindSettingsTriggers());
  shellObserver.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>shellObserver.disconnect(),8000);

  window.asmrtubeAppearance={showSettings,hideSettings,applyAppearance,getSettings:()=>({...settings})};
})();
