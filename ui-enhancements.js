// ASMRTube product UI enhancements v1.7
(function(){
  const SETTINGS_KEY='asmrtube.settings.v1';
  const $=s=>document.querySelector(s);
  let settings={brightness:100};
  try{settings={...settings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{}

  const style=document.createElement('style');
  style.textContent=`
    .brand-mark{position:relative;overflow:hidden;background:linear-gradient(145deg,#9f86ff,#7050df)!important;box-shadow:0 8px 28px rgba(128,91,242,.28)!important}
    .brand-mark svg{width:19px;height:19px;display:block}
    .brand-row{gap:8px}
    .brand-row .brand-lockup{margin-right:auto}
    .settings-btn{font-size:16px!important}
    .sidebar-version{display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:8px 5px 0;color:var(--muted);font-size:9px;letter-spacing:.08em;border-top:1px solid var(--border)}
    .sidebar-version strong{color:#b9b0d1;font-weight:700}
    .topbar{background:linear-gradient(180deg,rgba(17,19,24,.96),rgba(10,11,14,.9))!important;box-shadow:0 8px 30px rgba(0,0,0,.12)}
    .now-playing-wrap{display:flex;align-items:center;gap:12px;min-width:0;flex:1}
    .now-art{width:46px;height:46px;border-radius:10px;overflow:hidden;background:#151821;border:1px solid var(--border);flex:0 0 auto;box-shadow:0 7px 20px rgba(0,0,0,.22)}
    .now-art img{width:100%;height:100%;object-fit:cover;display:block}
    .now-art.empty{display:grid;place-items:center;color:#8f85ad;font-size:13px}
    .now-title h2{font-size:clamp(19px,2.2vw,27px)!important;letter-spacing:-.025em}
    .player-card,.timestamp-panel,.range-card,.transport-card,.info-card{box-shadow:0 12px 34px rgba(0,0,0,.16)}
    .player-card{border-color:rgba(255,255,255,.105)!important}
    #screenDimmer{position:fixed;inset:0;background:#000;pointer-events:none;z-index:40;opacity:0;transition:opacity .16s ease}
    .settings-dialog{width:min(500px,calc(100vw - 28px))}
    .settings-section{padding:14px 0;border-top:1px solid var(--border);display:grid;gap:11px}
    .settings-section:first-of-type{border-top:0}
    .settings-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
    .settings-section-head strong{font-size:13px}
    .brightness-value{min-width:44px;text-align:right;color:#d5c9ff;font-weight:800;font-variant-numeric:tabular-nums}
    .brightness-slider{width:100%;accent-color:var(--accent)}
    .brightness-presets{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
    .brightness-presets button{border:1px solid var(--border);background:var(--panel2);color:#c3c8d0;border-radius:9px;padding:8px 5px;cursor:pointer;font-size:11px}
    .brightness-presets button:hover,.brightness-presets button.active{background:var(--accentSoft);border-color:rgba(139,92,246,.28);color:#e2d9ff}
    .settings-note{color:var(--muted);font-size:11px;line-height:1.55}
    @media(max-width:760px){.now-art{width:40px;height:40px}.brightness-presets{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(style);

  const dimmer=document.createElement('div');
  dimmer.id='screenDimmer';
  dimmer.setAttribute('aria-hidden','true');
  document.body.appendChild(dimmer);

  function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}
  function applyBrightness(value,{save=true}={}){
    const n=Math.max(30,Math.min(100,Number(value)||100));
    settings.brightness=n;
    dimmer.style.opacity=String((100-n)/100);
    const slider=$('#brightnessSlider'),valueEl=$('#brightnessValue');
    if(slider)slider.value=String(n);
    if(valueEl)valueEl.textContent=`${n}%`;
    document.querySelectorAll('[data-brightness]').forEach(b=>b.classList.toggle('active',Number(b.dataset.brightness)===n));
    if(save)saveSettings();
  }

  const brandMark=$('.brand-mark');
  if(brandMark)brandMark.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h2.2l1.4-4.6 2.2 9.2 2.1-11.2 2.2 12.8 1.8-6.2H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const brandRow=$('.brand-row');
  if(brandRow){
    const addBtn=$('#addVideoBtn');
    const settingsBtn=document.createElement('button');
    settingsBtn.className='icon-btn subtle settings-btn';
    settingsBtn.id='settingsBtn';
    settingsBtn.title='設定';
    settingsBtn.setAttribute('aria-label','設定');
    settingsBtn.textContent='⚙';
    brandRow.insertBefore(settingsBtn,addBtn);
  }

  const sidebar=$('.sidebar');
  if(sidebar){
    const version=document.createElement('div');
    version.className='sidebar-version';
    version.innerHTML='<span>ASMRTUBE</span><strong>v1.7</strong>';
    sidebar.appendChild(version);
  }

  const nowTitle=$('.now-title');
  if(nowTitle){
    const wrap=document.createElement('div');
    wrap.className='now-playing-wrap';
    nowTitle.parentNode.insertBefore(wrap,nowTitle);
    const art=document.createElement('div');
    art.className='now-art empty';
    art.id='nowArt';
    art.textContent='A';
    wrap.appendChild(art);
    wrap.appendChild(nowTitle);

    const updateArt=()=>{
      let x=null;
      try{x=typeof itemById==='function'?itemById(state.selectedId):null}catch{}
      if(x?.videoId){art.className='now-art';art.innerHTML=`<img src="https://i.ytimg.com/vi/${x.videoId}/mqdefault.jpg" alt="">`}
      else{art.className='now-art empty';art.textContent='A'}
    };
    new MutationObserver(updateArt).observe($('#nowTitle'),{childList:true,characterData:true,subtree:true});
    updateArt();
  }

  const dialog=document.createElement('dialog');
  dialog.id='settingsDialog';
  dialog.className='dialog settings-dialog';
  dialog.innerHTML=`<form method="dialog">
    <div class="dialog-head"><div><div class="eyebrow">APP SETTINGS</div><h3>設定</h3></div><button value="cancel" class="icon-btn subtle">×</button></div>
    <div class="settings-section">
      <div class="settings-section-head"><div><strong>画面の明るさ</strong><div class="settings-note">夜や寝る前に画面全体を暗くします。</div></div><span class="brightness-value" id="brightnessValue">100%</span></div>
      <input class="brightness-slider" id="brightnessSlider" type="range" min="30" max="100" step="1" value="100">
      <div class="brightness-presets"><button type="button" data-brightness="100">100%</button><button type="button" data-brightness="75">75%</button><button type="button" data-brightness="55">55%</button><button type="button" data-brightness="35">35%</button></div>
    </div>
    <div class="settings-section"><div class="settings-note">設定はこのブラウザに自動保存されます。ASMRライブラリとは別に保存するため、作品データには影響しません。</div></div>
    <div class="dialog-actions"><button value="cancel" class="primary-btn">完了</button></div>
  </form>`;
  document.body.appendChild(dialog);

  $('#settingsBtn')?.addEventListener('click',()=>dialog.showModal());
  $('#brightnessSlider')?.addEventListener('input',e=>applyBrightness(e.target.value));
  document.querySelectorAll('[data-brightness]').forEach(b=>b.addEventListener('click',()=>applyBrightness(b.dataset.brightness)));
  applyBrightness(settings.brightness,{save:false});
})();
