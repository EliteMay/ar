// ASMRTube v2.1 — reliability, safer data handling and power-user quality layer
(function(){
  'use strict';

  const LIBRARY_KEY='asmrtube.library.v1';
  const $q=(s,r=document)=>r.querySelector(s);
  const $$q=(s,r=document)=>[...r.querySelectorAll(s)];
  let pendingPlayerAction=null;
  let playerReady=false;
  let undoTimer=null;

  function normalize(value){
    return String(value??'').toLowerCase().normalize('NFKC').replace(/[\s　]+/g,' ').trim();
  }

  function searchText(item){
    const timestamps=(item.timestamps||[]).flatMap(t=>[t.label,t.group,t.subtitle,t.parentLabel,...(t.tags||[])]);
    return normalize([item.title,item.creator,...(item.tags||[]),...timestamps].filter(Boolean).join(' '));
  }

  // Search title/creator/tags + timestamp labels/groups/subtitles.
  const baseFiltered=filtered;
  filtered=function(){
    const query=state.query;
    if(!query)return baseFiltered();
    let items=[];
    state.query='';
    try{items=baseFiltered()}finally{state.query=query}
    const terms=normalize(query).split(' ').filter(Boolean);
    return items.filter(item=>{
      const haystack=searchText(item);
      return terms.every(term=>haystack.includes(term));
    });
  };

  const baseRenderSongList=renderSongList;
  renderSongList=function(){
    baseRenderSongList();
    const list=$q('#songList');
    const items=filtered();
    if(!list||items.length||!state.library.length)return;
    const narrowed=!!state.query||state.filters.size>0;
    const viewOnly=state.currentView!=='all'&&!narrowed;
    list.innerHTML=`<div class="quality-empty-state"><div class="quality-empty-icon">⌕</div><strong>${narrowed?'条件に合うASMRがありません':viewOnly?'この一覧にはまだASMRがありません':'ASMRがありません'}</strong><span>${narrowed?'検索語やタグ条件を解除すると他の作品を表示できます。':viewOnly?'「すべて」へ戻るとライブラリ全体を確認できます。':'ASMRを追加してください。'}</span><button class="ghost-btn" id="qualityEmptyAction">${narrowed?'検索・絞り込みを解除':viewOnly?'すべて表示':'ASMRを追加'}</button></div>`;
    $q('#emptyState')?.classList.add('hidden');
    $q('#qualityEmptyAction')?.addEventListener('click',()=>{
      if(narrowed){state.query='';state.filters.clear();if($q('#searchInput'))$q('#searchInput').value='';renderFilters();renderSongList();return}
      if(viewOnly){$q('.view-btn[data-view="all"]')?.click();return}
      $q('#topAddBtn')?.click();
    });
  };

  function isPlayerReady(){
    if(!state.player||typeof state.player.getPlayerState!=='function')return false;
    try{
      const value=state.player.getPlayerState();
      return typeof value==='number';
    }catch{return false}
  }

  function applyPlayerAction(action){
    const item=itemById(action?.id);
    if(!item||!isPlayerReady())return false;
    try{
      state.player.setVolume(item.volume??35);
      state.currentId=item.id;
      if(action.play){
        state.player.loadVideoById({videoId:item.videoId,startSeconds:Number(action.start)||0});
        markRecent(item.id);
      }else{
        state.player.cueVideoById({videoId:item.videoId,startSeconds:Number(action.start)||0});
      }
      pendingPlayerAction=null;
      return true;
    }catch{return false}
  }

  function queuePlayerAction(id,start=0,play=false){
    pendingPlayerAction={id,start:Number(start)||0,play:!!play};
    if(play&&typeof toast==='function')toast('YouTubeプレイヤーを準備中です。準備後に再生します');
  }

  // Selection before IFrame API readiness is remembered instead of being lost.
  selectItem=function(id,{play=false,start=0}={}){
    const item=itemById(id);if(!item)return;
    state.selectedId=id;
    $q('#playerPlaceholder')?.classList.add('hidden');
    if($q('#volume'))$q('#volume').value=item.volume??35;
    if(isPlayerReady()){
      if(play)applyPlayerAction({id,start,play:true});
      else if(state.currentId!==id)applyPlayerAction({id,start,play:false});
      else state.player.setVolume(item.volume??35);
    }else queuePlayerAction(id,start,play);
    renderSongList();renderSelection();
  };

  playItem=function(id,start=0){
    const item=itemById(id);if(!item)return;
    state.selectedId=id;
    $q('#playerPlaceholder')?.classList.add('hidden');
    if($q('#volume'))$q('#volume').value=item.volume??35;
    if(!applyPlayerAction({id,start,play:true}))queuePlayerAction(id,start,true);
    renderSongList();renderSelection();
  };

  function flushPendingPlayerAction(){
    const ready=isPlayerReady();
    if(ready&&!playerReady)playerReady=true;
    if(ready&&pendingPlayerAction)applyPlayerAction(pendingPlayerAction);
  }
  const readinessTimer=setInterval(flushPendingPlayerAction,200);
  setTimeout(()=>clearInterval(readinessTimer),30000);

  // A cued item must still become "recent" when the user actually starts it.
  const playButton=$q('#playBtn');
  if(playButton)playButton.onclick=()=>{
    const item=itemById(state.selectedId);if(!item)return;
    if(!isPlayerReady()||state.currentId!==item.id)return playItem(item.id);
    try{
      if(state.player.getPlayerState()===YT.PlayerState.PLAYING)state.player.pauseVideo();
      else{markRecent(item.id);state.player.playVideo()}
    }catch{playItem(item.id)}
  };

  function showUndo(message,onUndo){
    let bar=$q('#qualityUndoToast');
    if(!bar){
      bar=document.createElement('div');bar.id='qualityUndoToast';bar.className='quality-undo-toast';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');document.body.appendChild(bar);
    }
    clearTimeout(undoTimer);
    bar.innerHTML=`<span>${esc(message)}</span><button type="button">元に戻す</button>`;
    bar.classList.add('show');
    bar.querySelector('button').onclick=()=>{clearTimeout(undoTimer);bar.classList.remove('show');onUndo()};
    undoTimer=setTimeout(()=>bar.classList.remove('show'),8000);
  }

  // Delete is reversible for 8 seconds and resets the player when deleting the loaded item.
  deleteItem=function(id){
    const item=itemById(id);if(!item||!confirm(`「${item.title}」を削除しますか？`))return;
    try{window.asmrtubeProductShell?.createSnapshot?.('before-delete')}catch{}
    const libraryIndex=state.library.findIndex(v=>v.id===id);
    const memberships=state.playlists.map(p=>({playlistId:p.id,index:p.items.indexOf(id)})).filter(x=>x.index>=0);
    const recentIndex=state.recent.indexOf(id);
    const wasSelected=state.selectedId===id;
    const wasCurrent=state.currentId===id;
    const removed=structuredClone?structuredClone(item):JSON.parse(JSON.stringify(item));

    state.library=state.library.filter(v=>v.id!==id);
    state.playlists.forEach(p=>p.items=p.items.filter(v=>v!==id));
    state.recent=state.recent.filter(v=>v!==id);
    if(wasSelected)state.selectedId=null;
    if(wasCurrent){
      state.currentId=null;pendingPlayerAction=null;
      try{state.player?.stopVideo?.()}catch{}
      $q('#playerPlaceholder')?.classList.remove('hidden');
      resetLoop();
    }
    save();renderAll();

    showUndo('ASMRを削除しました',()=>{
      if(state.library.some(x=>x.id===removed.id||x.videoId===removed.videoId))return toast('すでに同じASMRが存在するため復元できません');
      state.library.splice(Math.max(0,Math.min(libraryIndex,state.library.length)),0,removed);
      memberships.forEach(m=>{
        const p=state.playlists.find(x=>x.id===m.playlistId);if(!p)return;
        p.items.splice(Math.max(0,Math.min(m.index,p.items.length)),0,removed.id);
      });
      if(recentIndex>=0)state.recent.splice(Math.min(recentIndex,state.recent.length),0,removed.id);
      save();renderAll();
      if(wasSelected)selectItem(removed.id);
      toast('削除を元に戻しました');
    });
  };

  function sanitizeTimestamp(value){
    if(!value||typeof value!=='object')return null;
    const time=Number(value.time);if(!Number.isFinite(time)||time<0)return null;
    const label=String(value.label||'').trim()||'タイムスタンプ';
    const tags=Array.isArray(value.tags)?value.tags.map(String).map(x=>x.trim()).filter(Boolean):[];
    return {...value,time,label,tags};
  }

  function prepareImportedData(data){
    if(!data||typeof data!=='object'||!Array.isArray(data.library))throw new Error('library がありません');
    const seenVideos=new Set(),seenIds=new Set(),idMap=new Map();
    const library=[];let invalid=0,duplicates=0;
    for(const raw of data.library){
      if(!raw||typeof raw!=='object'){invalid++;continue}
      const videoId=String(raw.videoId||ytId(raw.url||'')||'').trim();
      const title=String(raw.title||'').trim();
      if(!videoId||!title){invalid++;continue}
      if(seenVideos.has(videoId)){duplicates++;continue}
      let id=String(raw.id||'').trim()||uid();
      if(seenIds.has(id))id=uid();
      seenIds.add(id);seenVideos.add(videoId);idMap.set(String(raw.id||id),id);
      library.push({...raw,id,videoId,title,creator:String(raw.creator||''),tags:Array.isArray(raw.tags)?raw.tags.map(String).map(x=>x.trim()).filter(Boolean):[],timestamps:Array.isArray(raw.timestamps)?raw.timestamps.map(sanitizeTimestamp).filter(Boolean):[],favorite:!!raw.favorite,sleepFriendly:!!raw.sleepFriendly});
    }
    const validIds=new Set(library.map(x=>x.id));
    const playlists=(Array.isArray(data.playlists)?data.playlists:[]).filter(p=>p&&typeof p==='object').map(p=>({
      ...p,
      id:String(p.id||'').trim()||uid(),
      name:String(p.name||'プレイリスト').trim()||'プレイリスト',
      items:[...new Set((Array.isArray(p.items)?p.items:[]).map(v=>idMap.get(String(v))||String(v)).filter(id=>validIds.has(id)))]
    }));
    const recent=[...new Set((Array.isArray(data.recent)?data.recent:[]).map(v=>idMap.get(String(v))||String(v)).filter(id=>validIds.has(id)))].slice(0,50);
    return {library,playlists,recent,invalid,duplicates};
  }

  // Import validates and previews impact before replacing local data.
  importJson=function(file){
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const prepared=prepareImportedData(JSON.parse(reader.result));
        const notes=[prepared.invalid?`無効 ${prepared.invalid}件を除外`:null,prepared.duplicates?`重複動画 ${prepared.duplicates}件を除外`:null].filter(Boolean).join(' / ');
        const ok=confirm(`ASMR ${prepared.library.length}件 / プレイリスト ${prepared.playlists.length}件を読み込みます。\n現在のライブラリは置き換えられます。${notes?`\n${notes}`:''}\n\n続行しますか？`);
        if(!ok)return;
        try{window.asmrtubeProductShell?.createSnapshot?.('before-import')}catch{}
        pendingPlayerAction=null;state.currentId=null;
        try{state.player?.stopVideo?.()}catch{}
        state.library=prepared.library;state.playlists=prepared.playlists;state.recent=prepared.recent;state.selectedId=state.library[0]?.id||null;
        save();renderAll();
        $q('#playerPlaceholder')?.classList.toggle('hidden',!!state.selectedId);
        if(state.selectedId)selectItem(state.selectedId);
        toast(`バックアップを読み込みました（ASMR ${prepared.library.length}件）`);
      }catch(error){toast(`読み込みできません: ${error?.message||'対応していないJSONです'}`)}
    };
    reader.onerror=()=>toast('JSONファイルを読み込めませんでした');
    reader.readAsText(file);
  };

  function diagnoseLibrary(){
    const problems=[];
    const videoIds=new Map();
    state.library.forEach((item,index)=>{
      if(!item?.id)problems.push(`IDなし: ${index+1}件目`);
      if(!item?.title)problems.push(`タイトルなし: ${index+1}件目`);
      if(!item?.videoId)problems.push(`動画IDなし: ${item?.title||index+1}`);
      if(item?.videoId){
        if(videoIds.has(item.videoId))problems.push(`動画ID重複: ${item.title||item.videoId}`);
        else videoIds.set(item.videoId,item.id);
      }
      (item?.timestamps||[]).forEach((t,i)=>{if(!Number.isFinite(Number(t?.time))||Number(t.time)<0)problems.push(`不正な時刻: ${item.title} #${i+1}`)});
    });
    const ids=new Set(state.library.map(x=>x.id));
    state.playlists.forEach(p=>(p.items||[]).forEach(id=>{if(!ids.has(id))problems.push(`存在しない作品参照: ${p.name}`)}));
    state.recent.forEach(id=>{if(!ids.has(id))problems.push('最近聴いたに存在しない作品参照')});
    return problems;
  }

  function installDiagnostics(){
    const body=$q('#dataDialog .product-dialog-body');if(!body||$q('#qualityDiagnostics'))return false;
    const section=document.createElement('section');section.className='product-section';section.id='qualityDiagnostics';
    section.innerHTML='<div class="product-section-title"><div><strong>ライブラリ診断</strong><span>重複動画・壊れたプレイリスト参照・不正なタイムスタンプを確認します。</span></div></div><div class="quality-diagnostic-status" id="qualityDiagnosticStatus">未診断</div><button type="button" class="ghost-btn" id="qualityDiagnosticBtn">整合性を確認</button>';
    body.appendChild(section);
    $q('#qualityDiagnosticBtn').onclick=()=>{
      const problems=diagnoseLibrary(),status=$q('#qualityDiagnosticStatus');
      status.classList.toggle('problem',!!problems.length);
      status.textContent=problems.length?`${problems.length}件の確認項目があります: ${problems.slice(0,4).join(' / ')}${problems.length>4?' …':''}`:'問題は見つかりませんでした。';
    };
    return true;
  }

  function installHelpShortcuts(){
    const grid=$q('#helpDialog .product-shortcut-grid');if(!grid||grid.dataset.v21)return false;
    grid.dataset.v21='1';
    grid.insertAdjacentHTML('beforeend','<div class="shortcut-row"><span>再生 / 一時停止</span><kbd>Space / K</kbd></div><div class="shortcut-row"><span>10秒戻る / 進む</span><kbd>J / L</kbd></div>');
    return true;
  }

  // Player keyboard controls (disabled while typing or while a dialog is open).
  window.addEventListener('keydown',event=>{
    const tag=event.target?.tagName?.toLowerCase();
    const typing=tag==='input'||tag==='textarea'||tag==='select'||event.target?.isContentEditable;
    if(typing||event.ctrlKey||event.metaKey||event.altKey||$q('dialog[open]'))return;
    const key=event.key.toLowerCase();
    if(key===' '||key==='k'){
      event.preventDefault();$q('#playBtn')?.click();return;
    }
    if((key==='j'||key==='l')&&isPlayerReady()){
      event.preventDefault();
      try{const now=state.player.getCurrentTime()||0;const duration=state.player.getDuration()||Infinity;state.player.seekTo(Math.max(0,Math.min(duration,now+(key==='j'?-10:10))),true)}catch{}
    }
  });

  // Small accessibility upgrades.
  const toastEl=$q('#toast');if(toastEl){toastEl.setAttribute('role','status');toastEl.setAttribute('aria-live','polite');toastEl.setAttribute('aria-atomic','true')}
  $q('#searchInput')?.setAttribute('aria-label','ASMRを検索');
  $q('#seek')?.setAttribute('aria-label','再生位置');
  $q('#volume')?.setAttribute('aria-label','音量');

  const enhancementTimer=setInterval(()=>{
    installDiagnostics();installHelpShortcuts();
    const badge=$q('.sidebar-version strong');if(badge)badge.textContent='v2.1';
    if(document.title.includes('ASMRTube'))document.title='ASMRTube v2.1';
    if(installDiagnostics()&&installHelpShortcuts())clearInterval(enhancementTimer);
  },250);
  setTimeout(()=>clearInterval(enhancementTimer),10000);
})();
