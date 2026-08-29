// ASMRTube product shell v2.0
(function(){
  const SETTINGS_KEY='asmrtube.settings.v1';
  const LIBRARY_KEY='asmrtube.library.v1';
  const SNAPSHOT_KEY='asmrtube.snapshot.v1';
  const PRE_RESTORE_KEY='asmrtube.snapshot.beforeRestore.v1';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let settings={brightness:100,compact:false,showThumbs:true,reduceMotion:false,startDashboard:false};
  try{settings={...settings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{}

  function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}

  const dimmer=document.createElement('div');
  dimmer.id='screenDimmer';
  dimmer.setAttribute('aria-hidden','true');
  document.body.appendChild(dimmer);

  function applySettings({save=true}={}){
    const brightness=Math.max(30,Math.min(100,Number(settings.brightness)||100));
    settings.brightness=brightness;
    dimmer.style.opacity=String((100-brightness)/100);
    document.documentElement.dataset.compact=settings.compact?'1':'0';
    document.documentElement.dataset.thumbs=settings.showThumbs?'1':'0';
    document.documentElement.dataset.reduceMotion=settings.reduceMotion?'1':'0';
    const slider=$('#brightnessSlider'),value=$('#brightnessValue');
    if(slider)slider.value=String(brightness);
    if(value)value.textContent=`${brightness}%`;
    $$('[data-brightness]').forEach(b=>b.classList.toggle('active',Number(b.dataset.brightness)===brightness));
    const pairs={compactToggle:'compact',thumbToggle:'showThumbs',motionToggle:'reduceMotion',startDashboardToggle:'startDashboard'};
    Object.entries(pairs).forEach(([id,key])=>{const el=$(`#${id}`);if(el)el.checked=!!settings[key]});
    if(save)saveSettings();
  }

  function brandSetup(){
    const brandMark=$('.brand-mark');
    if(brandMark)brandMark.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h2.2l1.4-4.6 2.2 9.2 2.1-11.2 2.2 12.8 1.8-6.2H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const brandRow=$('.brand-row');
    if(brandRow&&!$('#settingsBtn')){
      const addBtn=$('#addVideoBtn');
      const help=document.createElement('button');
      help.className='icon-btn subtle help-icon-btn';help.id='helpBtn';help.title='ヘルプ';help.setAttribute('aria-label','ヘルプ');help.textContent='?';
      const settingsBtn=document.createElement('button');
      settingsBtn.className='icon-btn subtle settings-btn';settingsBtn.id='settingsBtn';settingsBtn.title='設定';settingsBtn.setAttribute('aria-label','設定');settingsBtn.textContent='⚙';
      brandRow.insertBefore(help,addBtn);brandRow.insertBefore(settingsBtn,addBtn);
    }

    const sidebar=$('.sidebar');
    if(sidebar&&!$('.sidebar-version',sidebar)){
      const version=document.createElement('div');
      version.className='sidebar-version';
      version.innerHTML='<span>ASMRTUBE</span><strong>v2.0</strong>';
      sidebar.appendChild(version);
    }

    const nowTitle=$('.now-title');
    if(nowTitle&&!$('.now-playing-wrap')){
      const wrap=document.createElement('div');wrap.className='now-playing-wrap';
      nowTitle.parentNode.insertBefore(wrap,nowTitle);
      const art=document.createElement('div');art.className='now-art empty';art.id='nowArt';art.textContent='A';
      wrap.appendChild(art);wrap.appendChild(nowTitle);
      const updateArt=()=>{
        let x=null;
        try{x=typeof itemById==='function'?itemById(state.selectedId):null}catch{}
        if(x?.videoId){art.className='now-art';art.innerHTML=`<img src="https://i.ytimg.com/vi/${safe(x.videoId)}/mqdefault.jpg" alt="">`}
        else{art.className='now-art empty';art.textContent='A'}
      };
      const title=$('#nowTitle');if(title)new MutationObserver(updateArt).observe(title,{childList:true,characterData:true,subtree:true});
      updateArt();
    }
  }

  function createSettingsDialog(){
    if($('#settingsDialog'))return;
    const dialog=document.createElement('dialog');
    dialog.id='settingsDialog';dialog.className='dialog product-dialog';
    dialog.innerHTML=`<form method="dialog">
      <div class="dialog-head"><div><div class="eyebrow">APP SETTINGS</div><h3>設定</h3></div><button value="cancel" class="icon-btn subtle">×</button></div>
      <div class="product-dialog-body">
        <section class="product-section">
          <div class="product-section-title"><div><strong>画面の明るさ</strong><span>寝る前でも眩しくないよう、画面全体を30〜100%で暗くします。</span></div><b class="brightness-value" id="brightnessValue">100%</b></div>
          <input class="brightness-slider" id="brightnessSlider" type="range" min="30" max="100" step="1" value="100">
          <div class="brightness-presets"><button type="button" data-brightness="100">100%</button><button type="button" data-brightness="75">75%</button><button type="button" data-brightness="55">55%</button><button type="button" data-brightness="35">35%</button></div>
        </section>
        <section class="product-section">
          <div class="product-section-title"><div><strong>表示</strong><span>LyricTubeで使っている表示密度・軽量化系の設定をASMRTube向けに移植しています。</span></div></div>
          ${toggleRow('compactToggle','コンパクト表示','左ライブラリの1件あたりの高さを抑えます。')}
          ${toggleRow('thumbToggle','サムネイル表示','左一覧・最近聴いた一覧の画像を表示します。')}
          ${toggleRow('motionToggle','動きを減らす','アニメーションとスムーズスクロールを最小限にします。')}
          ${toggleRow('startDashboardToggle','起動時に概要を表示','サイトを開いた時にライブラリ概要を最初に表示します。')}
        </section>
        <section class="product-section"><div class="settings-note">設定はこのブラウザの <code>asmrtube.settings.v1</code> に保存され、ASMRライブラリとは分離されています。</div></section>
      </div>
      <div class="dialog-actions"><button type="button" class="ghost-btn" id="settingsHelpBtn">ヘルプ</button><button value="cancel" class="primary-btn">完了</button></div>
    </form>`;
    document.body.appendChild(dialog);
    $('#settingsBtn')?.addEventListener('click',()=>dialog.showModal());
    $('#brightnessSlider')?.addEventListener('input',e=>{settings.brightness=Number(e.target.value);applySettings()});
    $$('[data-brightness]',dialog).forEach(b=>b.addEventListener('click',()=>{settings.brightness=Number(b.dataset.brightness);applySettings()}));
    const pairs={compactToggle:'compact',thumbToggle:'showThumbs',motionToggle:'reduceMotion',startDashboardToggle:'startDashboard'};
    Object.entries(pairs).forEach(([id,key])=>$('#'+id)?.addEventListener('change',e=>{settings[key]=e.target.checked;applySettings()}));
    $('#settingsHelpBtn')?.addEventListener('click',()=>{dialog.close();$('#helpDialog')?.showModal()});
  }

  function toggleRow(id,title,description){
    return `<div class="product-setting-row"><div class="product-setting-copy"><strong>${title}</strong><span>${description}</span></div><label class="toggle"><input id="${id}" type="checkbox"><span class="toggle-track"></span></label></div>`;
  }

  function createHelpDialog(){
    if($('#helpDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='helpDialog';dialog.className='dialog product-dialog-wide';
    dialog.innerHTML=`<form method="dialog">
      <div class="dialog-head"><div><div class="eyebrow">HELP / GUIDE</div><h3>ASMRTubeの使い方</h3></div><button value="cancel" class="icon-btn subtle">×</button></div>
      <div class="product-dialog-body">
        <section class="product-section"><div class="product-section-title"><div><strong>基本の流れ</strong><span>登録からタイムスタンプ利用まで。</span></div></div><div class="help-steps"><div class="help-step">ASMR追加からYouTube URLを貼り付ける。タイトルとチャンネル名は自動取得されます。</div><div class="help-step">YouTubeコメント欄のタイムスタンプをそのままコピーして「コメントから取込」へ貼る。</div><div class="help-step">解析結果を確認し、必要なら見出し・時間・内容を修正して保存。</div><div class="help-step">右パネルの「見出し / すべて」を使い分け、目的の音へ直接ジャンプ。</div></div></section>
        <section class="product-section"><div class="product-section-title"><div><strong>対応タイムスタンプ例</strong><span>人によって違う書き方をv1.9以降の汎用パーサーで吸収します。</span></div></div><div class="help-code">0:00 開始\n[12:35](YouTube URL) 耳かき\n25:54 - 梵天(右耳)\n耳ふー  4:46 右  5:38 左\n▷ 38:10 スライム  └ 41:20 握力52kg\n1:40 柔らかいタオル Soft Towel</div></section>
        <section class="product-section"><div class="product-section-title"><div><strong>ショートカット</strong><span>入力欄を編集中は反応しません。</span></div></div><div class="product-shortcut-grid"><div class="shortcut-row"><span>検索へ移動</span><kbd>Ctrl K</kbd></div><div class="shortcut-row"><span>ヘルプを開く</span><kbd>?</kbd></div><div class="shortcut-row"><span>サイドバーを閉じる</span><kbd>Esc</kbd></div><div class="shortcut-row"><span>スクショ貼り付け等</span><kbd>Ctrl V</kbd></div></div></section>
        <section class="product-section"><div class="product-section-title"><div><strong>データ保護</strong><span>ブラウザのサイトデータを消すとlocalStorageも消えます。</span></div></div><div class="settings-note">重要なライブラリは定期的に「データ管理 → JSONを書き出す」でバックアップしてください。v2.0では読み込み・削除前にローカルスナップショットも作成します。</div></section>
      </div><div class="dialog-actions"><button value="cancel" class="primary-btn">閉じる</button></div>
    </form>`;
    document.body.appendChild(dialog);
    $('#helpBtn')?.addEventListener('click',()=>dialog.showModal());
  }

  function createSnapshot(reason='manual'){
    try{
      const raw=localStorage.getItem(LIBRARY_KEY)||JSON.stringify({library:state.library||[],playlists:state.playlists||[],recent:state.recent||[]});
      localStorage.setItem(SNAPSHOT_KEY,JSON.stringify({createdAt:Date.now(),reason,raw}));
      return true;
    }catch{return false}
  }

  function snapshotInfo(){
    try{return JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'null')}catch{return null}
  }

  function formatBytes(bytes){
    const n=Number(bytes)||0;if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;return `${(n/1024/1024).toFixed(2)} MB`;
  }

  function dataStats(){
    const library=state.library||[];
    const timestamps=library.reduce((n,x)=>n+(x.timestamps?.length||0),0);
    const raw=localStorage.getItem(LIBRARY_KEY)||'';
    let bytes=raw.length;try{bytes=new Blob([raw]).size}catch{}
    return {items:library.length,timestamps,playlists:(state.playlists||[]).length,storage:formatBytes(bytes)};
  }

  function refreshDataDialog(){
    const stats=dataStats();
    $('#dataItemCount')?.replaceChildren(document.createTextNode(String(stats.items)));
    $('#dataTimestampCount')?.replaceChildren(document.createTextNode(String(stats.timestamps)));
    $('#dataPlaylistCount')?.replaceChildren(document.createTextNode(String(stats.playlists)));
    $('#dataStorageSize')?.replaceChildren(document.createTextNode(stats.storage));
    const snap=snapshotInfo(),status=$('#snapshotStatus');
    if(status)status.textContent=snap?`最新スナップショット: ${new Date(snap.createdAt).toLocaleString('ja-JP')} / ${snap.reason}`:'スナップショットはまだありません。';
  }

  function createDataDialog(){
    if($('#dataDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='dataDialog';dialog.className='dialog product-dialog';
    dialog.innerHTML=`<form method="dialog"><div class="dialog-head"><div><div class="eyebrow">DATA MANAGEMENT</div><h3>データ管理</h3></div><button value="cancel" class="icon-btn subtle">×</button></div><div class="product-dialog-body">
      <section class="product-section"><div class="product-section-title"><div><strong>現在のデータ</strong><span>このブラウザに保存されているASMRTubeデータの概要です。</span></div></div><div class="data-stats"><div class="data-stat"><span>ASMR</span><strong id="dataItemCount">0</strong></div><div class="data-stat"><span>TIMESTAMPS</span><strong id="dataTimestampCount">0</strong></div><div class="data-stat"><span>PLAYLISTS</span><strong id="dataPlaylistCount">0</strong></div><div class="data-stat"><span>STORAGE</span><strong id="dataStorageSize">0 KB</strong></div></div></section>
      <section class="product-section"><div class="product-section-title"><div><strong>JSONバックアップ</strong><span>別PC・別ブラウザへの移行にも使えます。</span></div></div><div class="data-actions-grid"><button type="button" class="primary-soft" id="dataExportBtn">JSONを書き出す</button><button type="button" class="ghost-btn" id="dataImportBtn">JSONを読み込む</button></div></section>
      <section class="product-section"><div class="product-section-title"><div><strong>ローカルスナップショット</strong><span>誤削除や読み込みミス対策。ブラウザ内だけの簡易退避です。</span></div></div><div class="snapshot-status" id="snapshotStatus"></div><div class="data-actions-grid"><button type="button" class="ghost-btn" id="snapshotSaveBtn">今の状態を退避</button><button type="button" class="ghost-btn" id="snapshotRestoreBtn">退避状態へ戻す</button></div><div class="settings-note">サイトデータ自体を削除するとスナップショットも消えるため、重要なバックアップはJSON書き出しを使ってください。</div></section>
    </div><div class="dialog-actions"><button value="cancel" class="primary-btn">完了</button></div></form>`;
    document.body.appendChild(dialog);
    $('#dataExportBtn')?.addEventListener('click',()=>$('#exportBtn')?.click());
    $('#dataImportBtn')?.addEventListener('click',()=>$('#importInput')?.click());
    $('#snapshotSaveBtn')?.addEventListener('click',()=>{if(createSnapshot('manual')){refreshDataDialog();if(typeof toast==='function')toast('現在の状態を退避しました')}});
    $('#snapshotRestoreBtn')?.addEventListener('click',()=>{
      const snap=snapshotInfo();if(!snap?.raw)return typeof toast==='function'&&toast('復元できるスナップショットがありません');
      if(!confirm('現在のライブラリを退避状態で置き換えますか？'))return;
      try{
        const current=localStorage.getItem(LIBRARY_KEY)||'';
        localStorage.setItem(PRE_RESTORE_KEY,JSON.stringify({createdAt:Date.now(),raw:current}));
        localStorage.setItem(LIBRARY_KEY,snap.raw);location.reload();
      }catch{if(typeof toast==='function')toast('スナップショットを復元できませんでした')}
    });
  }

  function setupDataButton(){
    const tools=$('.sidebar-tools');
    if(tools&&!$('#dataManageBtn')){
      const b=document.createElement('button');b.className='ghost-btn';b.id='dataManageBtn';b.textContent='データ管理';tools.appendChild(b);
      b.addEventListener('click',()=>{refreshDataDialog();$('#dataDialog')?.showModal();closeMobileSidebar()});
    }
    $('#importInput')?.addEventListener('change',()=>createSnapshot('before-import'),true);
    document.addEventListener('click',e=>{if(e.target.closest?.('#infoDelete'))createSnapshot('before-delete')},true);
  }

  function createDashboard(){
    if($('#dashboardPage'))return;
    const nav=$('#nav');
    if(nav&&!$('#dashboardBtn')){
      const b=document.createElement('button');b.className='view-btn';b.id='dashboardBtn';b.innerHTML='<span>概要</span><span class="nav-count">⌂</span>';nav.prepend(b);b.addEventListener('click',showDashboard);
    }
    const workspace=$('.workspace');
    if(workspace){
      const page=document.createElement('section');page.id='dashboardPage';page.className='dashboard-page';workspace.insertAdjacentElement('beforebegin',page);
    }
    $$('.view-btn[data-view]').forEach(b=>b.addEventListener('click',()=>hideDashboard()));
    $('.sidebar')?.addEventListener('click',e=>{if(e.target.closest('.song-item,.playlist-item'))hideDashboard()});
  }

  function renderDashboard(){
    const page=$('#dashboardPage');if(!page)return;
    const library=state.library||[];
    const fav=library.filter(x=>x.favorite).length;
    const sleep=library.filter(x=>x.sleepFriendly||x.tags?.includes('睡眠')).length;
    const timestamps=library.reduce((n,x)=>n+(x.timestamps?.length||0),0);
    const recentIds=state.recent||[];
    let recent=recentIds.map(id=>library.find(x=>x.id===id)).filter(Boolean).slice(0,6);
    if(!recent.length)recent=[...library].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,6);
    const tagCounts=new Map();library.forEach(x=>(x.tags||[]).forEach(t=>tagCounts.set(t,(tagCounts.get(t)||0)+1)));
    const tags=[...tagCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ja')).slice(0,12);
    page.innerHTML=`<div class="dashboard-hero"><div class="dashboard-hero-copy"><div class="eyebrow">LIBRARY OVERVIEW</div><h2>聴きたいASMRへ、すぐ辿り着く。</h2><p>ライブラリ全体・最近聴いた作品・よく使うタグを1画面で確認できます。</p></div><div class="dashboard-hero-actions"><button class="ghost-btn" data-dashboard-action="data">データ管理</button><button class="primary-btn" data-dashboard-action="add">＋ ASMR追加</button></div></div>
      <div class="dashboard-stats"><article class="dashboard-stat"><span class="dashboard-stat-label">LIBRARY</span><strong class="dashboard-stat-value">${library.length}</strong><span class="dashboard-stat-note">登録ASMR</span></article><article class="dashboard-stat"><span class="dashboard-stat-label">FAVORITES</span><strong class="dashboard-stat-value">${fav}</strong><span class="dashboard-stat-note">お気に入り</span></article><article class="dashboard-stat"><span class="dashboard-stat-label">SLEEP</span><strong class="dashboard-stat-value">${sleep}</strong><span class="dashboard-stat-note">睡眠向け</span></article><article class="dashboard-stat"><span class="dashboard-stat-label">TIMESTAMPS</span><strong class="dashboard-stat-value">${timestamps}</strong><span class="dashboard-stat-note">登録タイムスタンプ</span></article></div>
      <div class="dashboard-grid"><section class="dashboard-panel"><div class="dashboard-panel-head"><h3>最近聴いた / 最近追加</h3><span>${recent.length}件</span></div>${recent.length?`<div class="dashboard-recent-grid">${recent.map(x=>`<button class="dashboard-recent" data-dashboard-item="${safe(x.id)}"><span class="dashboard-recent-thumb"><img src="https://i.ytimg.com/vi/${safe(x.videoId||'')}/mqdefault.jpg" alt=""></span><span class="dashboard-recent-copy"><strong>${safe(x.title||'無題')}</strong><span>${safe(x.creator||'配信者未設定')}</span></span></button>`).join('')}</div>`:'<div class="dashboard-empty">ASMRを追加するとここに表示されます。</div>'}</section>
      <aside class="dashboard-panel"><div class="dashboard-panel-head"><h3>よく使うタグ</h3><span>TOP ${tags.length}</span></div>${tags.length?`<div class="dashboard-tags">${tags.map(([name,count])=>`<span class="dashboard-tag">${safe(name)} <b>${count}</b></span>`).join('')}</div>`:'<div class="dashboard-empty">タグはまだありません。</div>'}<div class="dashboard-quick"><button class="ghost-btn" data-dashboard-view="favorites"><span>お気に入りを見る</span><span>${fav} →</span></button><button class="ghost-btn" data-dashboard-view="sleep"><span>睡眠向けを見る</span><span>${sleep} →</span></button><button class="ghost-btn" data-dashboard-view="recent"><span>最近聴いたを見る</span><span>${recentIds.length} →</span></button></div></aside></div>`;
    $$('[data-dashboard-item]',page).forEach(b=>b.addEventListener('click',()=>{hideDashboard();selectItem(b.dataset.dashboardItem);closeMobileSidebar()}));
    $$('[data-dashboard-view]',page).forEach(b=>b.addEventListener('click',()=>{hideDashboard();$(`.view-btn[data-view="${b.dataset.dashboardView}"]`)?.click()}));
    $('[data-dashboard-action="add"]',page)?.addEventListener('click',()=>{hideDashboard();$('#topAddBtn')?.click()});
    $('[data-dashboard-action="data"]',page)?.addEventListener('click',()=>{refreshDataDialog();$('#dataDialog')?.showModal()});
  }

  function showDashboard(){
    renderDashboard();document.body.classList.add('dashboard-mode');
    $$('.view-btn').forEach(b=>b.classList.toggle('active',b.id==='dashboardBtn'));
    if($('#viewEyebrow'))$('#viewEyebrow').textContent='LIBRARY OVERVIEW';
    if($('#nowTitle'))$('#nowTitle').textContent='ライブラリ概要';
    if($('#nowCreator'))$('#nowCreator').textContent='登録状況と最近聴いたASMR';
    closeMobileSidebar();
  }

  function hideDashboard(){
    if(!document.body.classList.contains('dashboard-mode'))return;
    document.body.classList.remove('dashboard-mode');$('#dashboardBtn')?.classList.remove('active');
  }

  function initMobileNavigation(){
    const topbar=$('.topbar'),sidebar=$('.sidebar'),brandRow=$('.brand-row');
    if(!topbar||!sidebar||$('#mobileMenuBtn'))return;
    const menu=document.createElement('button');menu.className='mobile-menu-btn';menu.id='mobileMenuBtn';menu.type='button';menu.textContent='☰';menu.setAttribute('aria-label','メニュー');menu.setAttribute('aria-expanded','false');topbar.prepend(menu);
    const close=document.createElement('button');close.className='mobile-sidebar-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','メニューを閉じる');brandRow?.appendChild(close);
    const backdrop=document.createElement('button');backdrop.className='mobile-sidebar-backdrop';backdrop.type='button';backdrop.setAttribute('aria-label','メニューを閉じる');document.body.appendChild(backdrop);
    menu.addEventListener('click',()=>{const open=document.body.classList.toggle('mobile-sidebar-open');menu.setAttribute('aria-expanded',String(open))});
    close.addEventListener('click',closeMobileSidebar);backdrop.addEventListener('click',closeMobileSidebar);
    sidebar.addEventListener('click',e=>{if(matchMedia('(max-width:900px)').matches&&e.target.closest('.song-item,.view-btn,.playlist-item'))setTimeout(closeMobileSidebar,30)});
  }

  function closeMobileSidebar(){document.body.classList.remove('mobile-sidebar-open');$('#mobileMenuBtn')?.setAttribute('aria-expanded','false')}

  function ensureParseInsights(){
    let box=$('#parseInsights');if(box)return box;
    const row=$('.parse-row');if(!row)return null;
    box=document.createElement('div');box.id='parseInsights';box.className='parse-insights';row.insertAdjacentElement('afterend',box);return box;
  }

  function updateParseInsights(){
    const box=ensureParseInsights();if(!box)return;
    let stats=null;try{stats=typeof getTimestampParseStats==='function'?getTimestampParseStats():null}catch{}
    const rows=state.parsedTimestamps||[];
    if(!stats||!rows.length){box.classList.remove('show');box.innerHTML='';return}
    const chips=[['検出',stats.total,'good'],['見出し',stats.groups,''],['親',stats.parents,''],['子',stats.children,''],['二言語',stats.bilingual,''],['URL時刻',stats.urlDerived,''],['要確認',stats.inferred,stats.inferred?'warn':'good']];
    box.innerHTML=chips.filter(([,v],i)=>i===0||Number(v)>0).map(([k,v,cls])=>`<span class="parse-insight ${cls}">${k}<strong>${v}</strong></span>`).join('');box.classList.add('show');
    if($('#parseSummary'))$('#parseSummary').textContent=stats.inferred?`${stats.total}件検出 / ${stats.inferred}件は推定を含みます`:`${stats.total}件検出 / 高信頼`;
    $$('.preview-grouped-row,.preview-row',$('#timestampPreview')).forEach((el,i)=>{
      const row=rows[i];if(!row)return;
      const confidence=Number(row.confidence??1);const badge=document.createElement('span');badge.className=`preview-confidence ${confidence>=.95?'high':confidence>=.85?'mid':''}`;badge.textContent=confidence>=.95?'高':confidence>=.85?'中':'確認';badge.title=`解析信頼度 ${Math.round(confidence*100)}%${row.role&&row.role!=='item'?` / ${row.role}`:''}`;el.appendChild(badge);if(confidence<.9)el.classList.add('parser-review');
    });
  }

  function setupParserInsights(){ensureParseInsights();$('#parseTimestampsBtn')?.addEventListener('click',()=>setTimeout(updateParseInsights,0))}

  function setupShortcuts(){
    window.addEventListener('keydown',e=>{
      const tag=e.target?.tagName?.toLowerCase(),typing=tag==='input'||tag==='textarea'||tag==='select'||e.target?.isContentEditable;
      if(e.key==='Escape'){closeMobileSidebar();return}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();closeMobileSidebar();$('#searchInput')?.focus();$('#searchInput')?.select();return}
      if(!typing&&e.key==='?'){e.preventDefault();$('#helpDialog')?.showModal()}
    });
  }

  brandSetup();
  createSettingsDialog();
  createHelpDialog();
  createDataDialog();
  setupDataButton();
  createDashboard();
  initMobileNavigation();
  setupParserInsights();
  setupShortcuts();
  applySettings({save:false});
  if(settings.startDashboard)setTimeout(showDashboard,80);

  window.asmrtubeProductShell={showDashboard,hideDashboard,refreshDataDialog,createSnapshot};
})();
