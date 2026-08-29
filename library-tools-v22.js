// ASMRTube v2.2 — resume playback, favorite sections, creator pages and manual timestamp editor
(function(){
  'use strict';

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[\s　]+/g,' ').trim();
  const makeId=()=>typeof uid==='function'?uid():(crypto.randomUUID?.()||`${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
  const currentItem=()=>{try{return typeof itemById==='function'?itemById(state.selectedId):null}catch{return null}};
  const fmtTime=value=>typeof fmt==='function'?fmt(value):String(value??0);
  let lastResumeSaveAt=0;
  let editorRows=[];

  function currentPosition(){
    try{return Number(state.player?.getCurrentTime?.()||0)}catch{return 0}
  }
  function currentDuration(){
    try{return Number(state.player?.getDuration?.()||0)}catch{return 0}
  }

  // Include favorite-section names in the global search without removing v2.1 timestamp search.
  const previousFiltered=filtered;
  filtered=function(){
    const query=state.query;
    if(!query)return previousFiltered();
    let items=[];
    state.query='';
    try{items=previousFiltered()}finally{state.query=query}
    const terms=normalize(query).split(' ').filter(Boolean);
    return items.filter(item=>{
      const sections=(item.favoriteSections||[]).flatMap(section=>[section.label,fmtTime(section.start),fmtTime(section.end)]);
      const timestamps=(item.timestamps||[]).flatMap(t=>[t.label,t.group,t.subtitle,t.parentLabel,...(t.tags||[])]);
      const text=normalize([item.title,item.creator,...(item.tags||[]),...timestamps,...sections].filter(Boolean).join(' '));
      return terms.every(term=>text.includes(term));
    });
  };

  // ----- Resume playback ---------------------------------------------------
  function persistResume(force=false){
    const id=state.currentId;
    if(!id||!state.player)return;
    const item=typeof itemById==='function'?itemById(id):null;
    if(!item)return;
    const now=Date.now();
    if(!force&&now-lastResumeSaveAt<5000)return;
    const time=currentPosition(),duration=currentDuration();
    if(!Number.isFinite(time)||time<0||!Number.isFinite(duration)||duration<=0)return;

    lastResumeSaveAt=now;
    if(time<8||duration-time<15||time/duration>=.975){
      if(item.resumeAt!=null){delete item.resumeAt;delete item.resumeDuration;delete item.resumeUpdatedAt;save();queueInfoRefresh()}
      return;
    }
    if(!force&&Math.abs(Number(item.resumeAt||0)-time)<3)return;
    item.resumeAt=Math.floor(time);
    item.resumeDuration=Math.floor(duration);
    item.resumeUpdatedAt=now;
    save();
    queueInfoRefresh();
  }

  setInterval(()=>persistResume(false),5000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persistResume(true)});
  window.addEventListener('pagehide',()=>persistResume(true));

  // ----- Favorite sections ------------------------------------------------
  function normalizeSections(item){
    if(!Array.isArray(item.favoriteSections))item.favoriteSections=[];
    item.favoriteSections=item.favoriteSections
      .filter(x=>x&&Number.isFinite(Number(x.start))&&Number.isFinite(Number(x.end))&&Number(x.end)>Number(x.start))
      .map(x=>({...x,id:String(x.id||makeId()),label:String(x.label||'お気に入り区間').trim()||'お気に入り区間',start:Number(x.start),end:Number(x.end)}))
      .sort((a,b)=>a.start-b.start);
    return item.favoriteSections;
  }

  function setLoopUi(start,end){
    state.loopA=Number(start);state.loopB=Number(end);
    const loop=$('#loopBtn'),status=$('#loopStatus');
    if(loop){loop.textContent='A-B ON';loop.classList.add('active')}
    if(status){status.textContent=`${fmtTime(start)} 〜 ${fmtTime(end)}`;status.classList.add('active')}
  }

  function playFavoriteSection(id,sectionId){
    const item=typeof itemById==='function'?itemById(id):null;if(!item)return;
    const section=normalizeSections(item).find(x=>x.id===sectionId);if(!section)return;
    setLoopUi(section.start,section.end);
    playItem(item.id,section.start);
    toast(`「${section.label}」を区間リピートします`);
  }

  function createSectionDialog(){
    if($('#favoriteSectionDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='favoriteSectionDialog';dialog.className='dialog v22-dialog';
    dialog.innerHTML=`<form method="dialog" id="favoriteSectionForm">
      <div class="dialog-head"><div><div class="eyebrow">FAVORITE SECTION</div><h3>お気に入り区間を保存</h3></div><button value="cancel" class="icon-btn subtle">×</button></div>
      <div class="v22-section-form">
        <label>名前<input id="favoriteSectionLabel" maxlength="80" placeholder="例: 一番好きな耳ふー"></label>
        <div class="two-col"><label>開始<input id="favoriteSectionStart" placeholder="12:34"></label><label>終了<input id="favoriteSectionEnd" placeholder="14:20"></label></div>
        <div class="v22-dialog-hint">A-B区間が設定されている場合はその範囲を自動入力します。未設定なら現在位置から30秒を仮入力します。</div>
      </div>
      <div class="dialog-actions"><button value="cancel" class="ghost-btn">キャンセル</button><button type="submit" class="primary-btn">保存</button></div>
    </form>`;
    document.body.appendChild(dialog);
    $('#favoriteSectionForm').addEventListener('submit',event=>{
      event.preventDefault();
      const item=currentItem();if(!item)return;
      const start=parseEditorTime($('#favoriteSectionStart').value),end=parseEditorTime($('#favoriteSectionEnd').value);
      if(start==null||end==null||end<=start)return toast('開始・終了時間を確認してください');
      const duration=currentDuration();if(duration&&end>duration+1)return toast('終了時間が動画時間を超えています');
      const label=$('#favoriteSectionLabel').value.trim()||`${fmtTime(start)} 〜 ${fmtTime(end)}`;
      normalizeSections(item).push({id:makeId(),label,start,end,createdAt:Date.now()});
      item.favoriteSections.sort((a,b)=>a.start-b.start);save();dialog.close();queueInfoRefresh();toast('お気に入り区間を保存しました');
    });
  }

  function openSectionDialog(){
    const item=currentItem();if(!item)return;
    createSectionDialog();
    const duration=currentDuration();
    let start=Number(state.loopA),end=Number(state.loopB);
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start){
      start=currentPosition();end=duration?Math.min(duration,start+30):start+30;
    }
    $('#favoriteSectionLabel').value='';$('#favoriteSectionStart').value=fmtTime(start);$('#favoriteSectionEnd').value=fmtTime(end);
    $('#favoriteSectionDialog').showModal();setTimeout(()=>$('#favoriteSectionLabel')?.focus(),0);
  }

  // ----- Creator page ------------------------------------------------------
  function createCreatorDialog(){
    if($('#creatorDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='creatorDialog';dialog.className='dialog v22-dialog v22-creator-dialog';
    dialog.innerHTML=`<form method="dialog"><div class="dialog-head"><div><div class="eyebrow">CREATOR LIBRARY</div><h3 id="creatorDialogTitle">配信者</h3><p class="muted small" id="creatorDialogMeta"></p></div><button value="cancel" class="icon-btn subtle">×</button></div><div id="creatorDialogBody"></div><div class="dialog-actions"><button value="cancel" class="primary-btn">閉じる</button></div></form>`;
    document.body.appendChild(dialog);
  }

  function showCreatorPage(creator){
    const name=String(creator||'').trim();if(!name)return toast('配信者が設定されていません');
    createCreatorDialog();
    const key=normalize(name),items=state.library.filter(x=>normalize(x.creator)===key).sort((a,b)=>(b.rating||0)-(a.rating||0)||(b.createdAt||0)-(a.createdAt||0));
    const fav=items.filter(x=>x.favorite).length,sleep=items.filter(x=>x.sleepFriendly||x.tags?.includes('睡眠')).length,timestamps=items.reduce((n,x)=>n+(x.timestamps?.length||0),0);
    const tagMap=new Map();items.forEach(x=>(x.tags||[]).forEach(tag=>tagMap.set(tag,(tagMap.get(tag)||0)+1)));
    const tags=[...tagMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    $('#creatorDialogTitle').textContent=name;$('#creatorDialogMeta').textContent=`${items.length}作品 ・ お気に入り${fav} ・ 睡眠向け${sleep} ・ タイムスタンプ${timestamps}`;
    $('#creatorDialogBody').innerHTML=`<div class="creator-summary"><div><strong>${items.length}</strong><span>登録作品</span></div><div><strong>${fav}</strong><span>お気に入り</span></div><div><strong>${timestamps}</strong><span>タイムスタンプ</span></div></div>${tags.length?`<div class="creator-tags">${tags.map(([tag,count])=>`<span>${safe(tag)} <b>${count}</b></span>`).join('')}</div>`:''}<div class="creator-work-grid">${items.map(item=>`<button type="button" class="creator-work" data-creator-item="${safe(item.id)}"><span class="creator-work-thumb"><img src="https://i.ytimg.com/vi/${safe(item.videoId||'')}/mqdefault.jpg" alt=""></span><span class="creator-work-copy"><strong>${safe(item.title||'無題')}</strong><span>${ratingLabel(item.rating)}${item.favorite?' ・ ★':''}${item.resumeAt?` ・ 続き ${fmtTime(item.resumeAt)}`:''}</span></span></button>`).join('')}</div>`;
    $$('[data-creator-item]',$('#creatorDialogBody')).forEach(button=>button.onclick=()=>{dialog.close();selectItem(button.dataset.creatorItem);window.asmrtubeProductShell?.hideDashboard?.()});
    const dialog=$('#creatorDialog');dialog.showModal();
  }

  // ----- Info-card integrations -------------------------------------------
  let infoRefreshQueued=false;
  function queueInfoRefresh(){
    if(infoRefreshQueued)return;infoRefreshQueued=true;
    queueMicrotask(()=>{infoRefreshQueued=false;enhanceInfoCard()});
  }

  function enhanceInfoCard(){
    const info=$('#infoCard'),item=currentItem();if(!info||!item||!info.querySelector('.info-actions'))return;
    if(info.querySelector('.v22-library-tools'))return;
    const sections=normalizeSections(item);
    const wrapper=document.createElement('div');wrapper.className='v22-library-tools';
    const resume=Number(item.resumeAt||0),resumeDuration=Number(item.resumeDuration||0);
    wrapper.innerHTML=`${resume>8?`<div class="resume-card"><div><span>前回の続き</span><strong>${fmtTime(resume)}${resumeDuration?` / ${fmtTime(resumeDuration)}`:''}</strong></div><button type="button" class="primary-soft" id="resumePlayBtn">▶ 続きから</button></div>`:''}<div class="v22-tool-row"><button type="button" class="ghost-btn" id="creatorPageBtn">配信者ページ</button><button type="button" class="ghost-btn" id="saveFavoriteSectionBtn">＋ お気に入り区間</button></div><div class="favorite-sections"><div class="favorite-sections-head"><strong>お気に入り区間</strong><span>${sections.length}件</span></div>${sections.length?`<div class="favorite-section-list">${sections.map(section=>`<div class="favorite-section-item"><button type="button" class="favorite-section-play" data-section-play="${safe(section.id)}"><span>${safe(section.label)}</span><small>${fmtTime(section.start)} 〜 ${fmtTime(section.end)}</small></button><button type="button" class="favorite-section-delete" data-section-delete="${safe(section.id)}" title="削除">×</button></div>`).join('')}</div>`:'<div class="favorite-section-empty">A-B区間や好きな場面を名前付きで保存できます。</div>'}</div>`;
    info.querySelector('.info-actions').insertAdjacentElement('beforebegin',wrapper);
    $('#resumePlayBtn',wrapper)?.addEventListener('click',()=>playItem(item.id,resume));
    $('#creatorPageBtn',wrapper)?.addEventListener('click',()=>showCreatorPage(item.creator));
    $('#saveFavoriteSectionBtn',wrapper)?.addEventListener('click',openSectionDialog);
    $$('[data-section-play]',wrapper).forEach(button=>button.onclick=()=>playFavoriteSection(item.id,button.dataset.sectionPlay));
    $$('[data-section-delete]',wrapper).forEach(button=>button.onclick=()=>{
      const section=sections.find(x=>x.id===button.dataset.sectionDelete);if(!section)return;
      if(!confirm(`「${section.label}」を削除しますか？`))return;
      item.favoriteSections=sections.filter(x=>x.id!==section.id);save();queueInfoRefresh();renderSelection();toast('お気に入り区間を削除しました');
    });
  }

  const infoCard=$('#infoCard');if(infoCard)new MutationObserver(queueInfoRefresh).observe(infoCard,{childList:true,subtree:true});
  queueInfoRefresh();

  // Creator name in the top bar is also clickable.
  const nowCreator=$('#nowCreator');
  if(nowCreator){nowCreator.classList.add('creator-link');nowCreator.setAttribute('title','配信者ページを開く');nowCreator.addEventListener('click',()=>{const item=currentItem();if(item)showCreatorPage(item.creator)})}

  // ----- Manual timestamp editor ------------------------------------------
  function parseEditorTime(value){
    if(typeof parseTime==='function'){
      const parsed=parseTime(String(value||'').trim());if(parsed!=null)return parsed;
    }
    const parts=String(value||'').trim().split(':').map(Number);
    if(parts.some(Number.isNaN))return null;
    if(parts.length===2&&parts[1]<60)return parts[0]*60+parts[1];
    if(parts.length===3&&parts[1]<60&&parts[2]<60)return parts[0]*3600+parts[1]*60+parts[2];
    return null;
  }

  function createTimestampEditor(){
    if($('#timestampEditDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='timestampEditDialog';dialog.className='dialog timestamp-edit-dialog';
    dialog.innerHTML=`<form method="dialog" id="timestampEditForm"><div class="dialog-head"><div><div class="eyebrow">TIMESTAMP EDITOR</div><h3>保存済みタイムスタンプを編集</h3><p class="muted small">時間・見出し・内容・副題を直接修正できます。親子情報は可能な範囲で維持します。</p></div><button value="cancel" class="icon-btn subtle">×</button></div><div class="timestamp-edit-toolbar"><button type="button" class="ghost-btn" id="timestampAddCurrent">＋ 現在位置</button><button type="button" class="ghost-btn" id="timestampAddBlank">＋ 空の行</button><span id="timestampEditCount"></span></div><div class="timestamp-edit-head"><span>見出し</span><span>時間</span><span>内容</span><span>副題</span><span></span></div><div id="timestampEditRows" class="timestamp-edit-rows"></div><div class="dialog-actions"><button value="cancel" class="ghost-btn">キャンセル</button><button type="submit" class="primary-btn">変更を保存</button></div></form>`;
    document.body.appendChild(dialog);
    $('#timestampAddCurrent').onclick=()=>addEditorRow(Math.floor(currentPosition()));
    $('#timestampAddBlank').onclick=()=>addEditorRow(0);
    $('#timestampEditForm').addEventListener('submit',saveTimestampEdits);
    $('#timestampEditRows').addEventListener('click',event=>{
      const button=event.target.closest('[data-remove-edit-row]');if(!button)return;
      editorRows=editorRows.filter(row=>row.key!==button.dataset.removeEditRow);renderTimestampEditorRows();
    });
  }

  function openTimestampEditor(){
    const item=currentItem();if(!item)return;
    createTimestampEditor();
    editorRows=(item.timestamps||[]).map((row,index)=>({key:`existing-${index}-${makeId()}`,originalTime:Number(row.time),data:{...row}}));
    renderTimestampEditorRows();$('#timestampEditDialog').showModal();
  }

  function addEditorRow(time){
    editorRows.push({key:`new-${makeId()}`,originalTime:null,data:{time:Number(time)||0,label:'タイムスタンプ',group:'',subtitle:'',role:'item',confidence:1,sourceStyle:'manual',tags:[]}});
    editorRows.sort((a,b)=>Number(a.data.time)-Number(b.data.time));renderTimestampEditorRows();
    requestAnimationFrame(()=>$('#timestampEditRows')?.lastElementChild?.scrollIntoView({behavior:'smooth',block:'nearest'}));
  }

  function renderTimestampEditorRows(){
    const box=$('#timestampEditRows');if(!box)return;
    $('#timestampEditCount').textContent=`${editorRows.length}件`;
    box.innerHTML=editorRows.map(row=>{const data=row.data||{};return `<div class="timestamp-edit-row" data-edit-key="${safe(row.key)}"><input data-field="group" value="${safe(data.group||'')}" placeholder="見出しなし"><input data-field="time" value="${safe(fmtTime(data.time))}" placeholder="0:00"><div class="timestamp-edit-label-wrap"><input data-field="label" value="${safe(data.label||'')}" placeholder="内容">${data.role&&data.role!=='item'?`<span class="timestamp-edit-role">${data.role==='parent'?'親':'子'}</span>`:''}</div><input data-field="subtitle" value="${safe(data.subtitle||'')}" placeholder="副題なし"><button type="button" class="timestamp-edit-remove" data-remove-edit-row="${safe(row.key)}" title="削除">×</button></div>`}).join('');
  }

  function saveTimestampEdits(event){
    event.preventDefault();const item=currentItem();if(!item)return;
    const drafts=[];let invalid=false;
    $$('.timestamp-edit-row',$('#timestampEditRows')).forEach(dom=>{
      const source=editorRows.find(row=>row.key===dom.dataset.editKey);if(!source)return;
      const time=parseEditorTime($('[data-field="time"]',dom).value);if(time==null){invalid=true;dom.classList.add('invalid');return}
      const group=$('[data-field="group"]',dom).value.trim(),label=$('[data-field="label"]',dom).value.trim()||'タイムスタンプ',subtitle=$('[data-field="subtitle"]',dom).value.trim();
      const next={...source.data,time,group,label,editedAt:Date.now()};
      if(subtitle)next.subtitle=subtitle;else delete next.subtitle;
      next.tags=typeof guessTags==='function'?guessTags(label,group,subtitle):Array.isArray(next.tags)?next.tags:[];
      drafts.push({key:source.key,originalTime:source.originalTime,data:next});
    });
    if(invalid)return toast('時間の形式を確認してください');

    const parentMap=new Map();
    drafts.forEach(row=>{if(row.data.role==='parent'&&row.originalTime!=null)parentMap.set(Number(row.originalTime),{time:Number(row.data.time),label:row.data.label})});
    drafts.forEach(row=>{
      const data=row.data;
      if(data.role!=='child'||data.parentTime==null)return;
      const parent=parentMap.get(Number(data.parentTime));
      if(parent){data.parentTime=parent.time;data.parentLabel=parent.label;data.depth=1}
      else{data.role='item';data.depth=0;delete data.parentTime;delete data.parentLabel}
    });

    item.timestamps=drafts.map(row=>row.data).sort((a,b)=>Number(a.time)-Number(b.time));
    save();$('#timestampEditDialog').close();window.renderTimestamps?.();renderFilters();toast('タイムスタンプを更新しました');
  }

  function installTimestampEditButton(){
    const tools=$('.timestamp-tools');if(!tools||$('#timestampEditBtn'))return false;
    const button=document.createElement('button');button.id='timestampEditBtn';button.className='ghost-btn';button.textContent='編集';button.disabled=!state.selectedId;button.onclick=openTimestampEditor;tools.prepend(button);return true;
  }

  const tsPanel=$('.timestamp-panel');if(tsPanel)new MutationObserver(()=>{installTimestampEditButton();const button=$('#timestampEditBtn');if(button)button.disabled=!state.selectedId}).observe(tsPanel,{childList:true,subtree:true});
  installTimestampEditButton();
  const selectionTitle=$('#nowTitle');if(selectionTitle)new MutationObserver(()=>{const button=$('#timestampEditBtn');if(button)button.disabled=!state.selectedId;queueInfoRefresh()}).observe(selectionTitle,{childList:true,subtree:true,characterData:true});

  // Version label.
  const versionTimer=setInterval(()=>{const badge=$('.sidebar-version strong');if(badge){badge.textContent='v2.2';clearInterval(versionTimer)}},200);
  setTimeout(()=>clearInterval(versionTimer),5000);
  document.title='ASMRTube v2.2';

  window.asmrtubeLibraryTools={persistResume,showCreatorPage,openSectionDialog,openTimestampEditor};
})();