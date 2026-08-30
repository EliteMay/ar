// ASMRTube timestamp UI — explicit render/event integration.
(function(){
  'use strict';

  const VIEW_KEY='asmrtube.timestamp.view.v1';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  let chapterRanges=[];
  let lastActiveChapter=-1;
  let selectedChapter=-1;
  let viewMode='chapters';
  const expandedChapters=new Set();

  try{viewMode=localStorage.getItem(VIEW_KEY)||'chapters'}catch{}
  function saveViewMode(){try{localStorage.setItem(VIEW_KEY,viewMode)}catch{}}
  function getCurrentItem(){return typeof itemById==='function'?itemById(state.selectedId):null}

  function ensureModeBar(){
    let bar=$('#timestampViewMode');if(bar)return bar;
    const panel=$('.timestamp-panel'),head=panel?.querySelector('.timestamp-head');if(!panel||!head)return null;
    bar=document.createElement('div');bar.id='timestampViewMode';bar.className='timestamp-view-mode';
    bar.innerHTML=`<div class="timestamp-view-tabs"><button class="timestamp-view-tab" data-mode="chapters">見出し</button><button class="timestamp-view-tab" data-mode="all">すべて</button></div><div class="timestamp-view-meta" id="timestampViewMeta"></div>`;
    head.insertAdjacentElement('afterend',bar);
    bar.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{viewMode=button.dataset.mode;saveViewMode();renderCurrentMode()});
    return bar;
  }
  function roleClass(t){
    if(t.role==='parent')return 'timestamp-role-parent';
    if(t.role==='child')return 'timestamp-role-child';
    return '';
  }
  function rowHtml(t,index,extraClass=''){
    const badge=t.role==='parent'?'<span class="timestamp-role-badge">親</span>':'';
    const subtitle=t.subtitle?`<span class="timestamp-subtitle">${esc(t.subtitle)}</span>`:'';
    const title=t.role==='child'&&t.parentLabel?`親: ${t.parentLabel}`:t.label;
    return `<div class="timestamp-row ${roleClass(t)} ${extraClass}" data-time="${Number(t.time)||0}"${t.role==='child'&&t.parentLabel?` title="${attr(title)}"`:''}>
      <button class="timestamp-time timestamp-jump" data-time="${Number(t.time)||0}" title="${attr(t.label)}">${fmt(t.time)}</button>
      <button class="timestamp-label timestamp-jump" data-time="${Number(t.time)||0}" title="${attr(t.label)}"><span>${esc(t.label)}</span>${badge}${subtitle}</button>
      <button class="timestamp-delete" data-index="${index}" title="削除" aria-label="${attr(t.label)}を削除">×</button>
    </div>`;
  }
  function buildChapterRanges(rows){
    const result=[];
    for(let i=0;i<rows.length;){
      const group=String(rows[i].group||'').trim();
      if(!group){i++;continue}
      let j=i+1;while(j<rows.length&&String(rows[j].group||'').trim()===group)j++;
      result.push({name:group,start:Number(rows[i].time)||0,end:j<rows.length?Number(rows[j].time):Infinity,rowStart:i,rowEnd:j-1,count:j-i,index:result.length});
      i=j;
    }
    return result;
  }
  function getActiveChapter(currentTime){
    const time=Number(currentTime)||0;let active=-1;
    chapterRanges.forEach((chapter,index)=>{if(time>=chapter.start&&time<chapter.end)active=index});
    return active;
  }
  function playAt(time){
    const item=getCurrentItem();if(!item)return;
    if(state.player?.seekTo&&state.currentId===item.id){
      state.player.seekTo(Number(time)||0,true);state.player.playVideo?.();markRecent(item.id);
    }else playItem(item.id,Number(time)||0);
  }
  function selectChapter(index,{play=false}={}){
    if(!chapterRanges[index])return;selectedChapter=index;
    if(play)playAt(chapterRanges[index].start);renderCurrentMode();
  }
  function bindCommonActions(){
    const item=getCurrentItem();if(!item)return;
    $$('.timestamp-jump').forEach(button=>button.onclick=()=>playItem(item.id,Number(button.dataset.time)));
    $$('.timestamp-delete').forEach(button=>button.onclick=()=>{
      const index=Number(button.dataset.index),before=[...(item.timestamps||[])];
      item.timestamps.splice(index,1);
      if(!save()){item.timestamps=before;return}
      renderTimestamps();toast('タイムスタンプを削除しました');
    });
  }
  function parentOverviewHtml(rows){
    const parents=rows.filter(row=>row.role==='parent');
    if(!parents.length)return '';
    return `<div class="role-parent-overview" id="roleParentOverview"><div class="role-parent-head"><strong>親タイムスタンプ</strong><span>${parents.length}件</span></div><div class="role-parent-grid">${parents.map(parent=>{
      const count=rows.filter(row=>row.role==='child'&&Number(row.parentTime)===Number(parent.time)).length;
      return `<button type="button" class="role-parent-card" data-parent-time="${Number(parent.time)||0}"><span class="role-parent-name">${esc(parent.label||'親')}</span><span class="role-parent-time">${fmt(parent.time)}</span><small>${count?`${count}子項目`:'親タイムスタンプ'}</small></button>`;
    }).join('')}</div></div>`;
  }
  function bindParentOverview(){
    $$('[data-parent-time]').forEach(button=>button.onclick=()=>playAt(Number(button.dataset.parentTime)||0));
  }
  function renderChapterMode(rows){
    const view=$('#timestampView');
    const standaloneCount=rows.filter(row=>!String(row.group||'').trim()).length;
    if(!chapterRanges.length){
      const parentHtml=parentOverviewHtml(rows);
      view.innerHTML=`<div class="chapter-overview">${parentHtml}<div class="empty-copy"><strong>${parentHtml?'大見出しはありません':'見出しがありません'}</strong><span>${parentHtml?'親タイムスタンプから直接ジャンプできます。全件を時系列で見る場合は「すべて」を使ってください。':'この動画は見出しグループがないため「すべて」で確認できます。'}</span></div><button class="chapter-other-card" id="openAllTimestamps"><span>すべてのタイムスタンプを見る</span><span>${rows.length}件</span></button></div>`;
      bindParentOverview();
      $('#openAllTimestamps').onclick=()=>{viewMode='all';saveViewMode();renderCurrentMode()};
      return;
    }

    if(selectedChapter<0||!chapterRanges[selectedChapter])selectedChapter=Math.max(0,getActiveChapter(state.player?.getCurrentTime?.()||0));
    const selected=chapterRanges[selectedChapter],active=getActiveChapter(state.player?.getCurrentTime?.()||0);
    let html='<div class="chapter-overview"><div class="chapter-overview-grid">';
    chapterRanges.forEach((chapter,index)=>{
      html+=`<button class="chapter-card ${index===active?'active':''} ${index===selectedChapter?'selected':''}" data-select-chapter="${index}"><span class="chapter-card-name">${esc(chapter.name)}</span><span class="chapter-card-time">${fmt(chapter.start)}</span><span class="chapter-card-count">${chapter.count}項目</span></button>`;
    });
    if(standaloneCount)html+=`<button class="chapter-other-card" id="openAllTimestamps"><span>その他のタイムスタンプ</span><span>${standaloneCount}件 →</span></button>`;
    html+='</div></div>';
    if(selected){
      html+=`<div class="chapter-focus"><div class="chapter-focus-head"><div class="chapter-focus-title"><strong>${esc(selected.name)}</strong><span>${fmt(selected.start)} ・ ${selected.count}項目</span></div><button class="chapter-focus-play" data-play-chapter="${selectedChapter}">▶ ここから再生</button></div>`;
      for(let i=selected.rowStart;i<=selected.rowEnd;i++)html+=rowHtml(rows[i],i);
      html+='</div>';
    }
    view.innerHTML=html;
    $$('[data-select-chapter]').forEach(button=>button.onclick=()=>selectChapter(Number(button.dataset.selectChapter),{play:true}));
    $$('[data-play-chapter]').forEach(button=>button.onclick=()=>playAt(chapterRanges[Number(button.dataset.playChapter)]?.start||0));
    $('#openAllTimestamps')?.addEventListener('click',()=>{viewMode='all';saveViewMode();renderCurrentMode()});
    bindCommonActions();
  }
  function renderAllMode(rows){
    const view=$('#timestampView'),active=getActiveChapter(state.player?.getCurrentTime?.()||0);
    let html='<div class="timestamp-all">',chapterIndex=0;
    for(let i=0;i<rows.length;){
      const group=String(rows[i].group||'').trim();
      if(group){
        const chapter=chapterRanges[chapterIndex],open=expandedChapters.has(chapterIndex)||chapterIndex===active;
        html+=`<div class="timestamp-block ${open?'open':''} ${chapterIndex===active?'active-group':''}" data-chapter-index="${chapterIndex}"><div class="timestamp-group-line"><button class="timestamp-group-toggle" data-toggle-chapter="${chapterIndex}" aria-expanded="${open}"><span class="timestamp-group-caret">▶</span><span class="timestamp-group-name">${esc(group)}</span><span class="timestamp-group-count">${chapter.count}</span></button><span class="timestamp-group-time">${fmt(chapter.start)}</span><button class="timestamp-group-play" data-play-chapter="${chapterIndex}" title="${attr(group)}の先頭から再生">▶</button></div><div class="timestamp-group-body">`;
        let j=i;while(j<rows.length&&String(rows[j].group||'').trim()===group){html+=rowHtml(rows[j],j);j++}
        html+='</div></div>';chapterIndex++;i=j;
      }else{html+=rowHtml(rows[i],i,'timestamp-standalone');i++}
    }
    html+='</div>';view.innerHTML=html;
    $$('[data-toggle-chapter]').forEach(button=>button.onclick=()=>{
      const index=Number(button.dataset.toggleChapter);
      expandedChapters.has(index)?expandedChapters.delete(index):expandedChapters.add(index);
      selectedChapter=index;renderCurrentMode();
    });
    $$('[data-play-chapter]').forEach(button=>button.onclick=()=>{
      const index=Number(button.dataset.playChapter);selectedChapter=index;expandedChapters.add(index);
      playAt(chapterRanges[index]?.start||0);renderCurrentMode();
    });
    bindCommonActions();
  }
  function updateRowActive(currentTime){
    const rows=$$('.timestamp-row');
    if(!rows.length||state.currentId!==state.selectedId){rows.forEach(row=>row.classList.remove('active'));return}
    let active=-1;rows.forEach((row,index)=>{if(Number(row.dataset.time)<=currentTime)active=index});
    rows.forEach((row,index)=>row.classList.toggle('active',index===active));
  }
  function updatePlaybackHighlight(currentTime){
    updateRowActive(currentTime);
    const active=getActiveChapter(currentTime);
    if(active===lastActiveChapter)return;
    lastActiveChapter=active;
    if(active>=0){selectedChapter=active;expandedChapters.add(active)}
    if(viewMode==='chapters'&&chapterRanges.length){renderCurrentMode();return}
    $$('.timestamp-block').forEach(block=>{
      const isActive=Number(block.dataset.chapterIndex)===active;
      block.classList.toggle('active-group',isActive);
      if(isActive){
        block.classList.add('open');
        block.querySelector('.timestamp-group-toggle')?.setAttribute('aria-expanded','true');
      }
    });
  }
  function renderCurrentMode(){
    const item=getCurrentItem(),view=$('#timestampView'),rows=item?.timestamps||[];
    ensureModeBar();
    $$('.timestamp-view-tab').forEach(button=>button.classList.toggle('active',button.dataset.mode===viewMode));
    const meta=$('#timestampViewMeta');if(meta)meta.textContent=viewMode==='chapters'?`${chapterRanges.length}見出し`:`${rows.length}件`;
    if(!item||!rows.length){
      view.className='timestamp-view empty';view.innerHTML='<div class="empty-copy"><strong>タイムスタンプなし</strong><span>コメント欄のタイムスタンプを貼り付けて登録できます。</span></div>';return;
    }
    view.className='timestamp-view';
    if(viewMode==='chapters')renderChapterMode(rows);else renderAllMode(rows);
    updateRowActive(state.player?.getCurrentTime?.()||0);
  }
  function renderTimestamps(){
    const item=getCurrentItem(),rows=item?.timestamps||[];
    if($('#timestampCount'))$('#timestampCount').textContent=rows.length;
    if(rows.length)rows.sort((a,b)=>Number(a.time)-Number(b.time));
    chapterRanges=buildChapterRanges(rows);selectedChapter=-1;lastActiveChapter=-1;expandedChapters.clear();
    renderCurrentMode();
    document.dispatchEvent(new CustomEvent('asmrtube:timestamps-rendered',{detail:{item,rows}}));
  }
  function renderTimestampPreview(){
    const rows=state.parsedTimestamps||[];
    $('#parseSummary').textContent=`${rows.length}件検出しました`;
    $('#timestampPreview').innerHTML=rows.map((t,index)=>`<div class="preview-grouped-row"><input aria-label="見出し" data-i="${index}" data-k="group" value="${attr(t.group||'')}" placeholder="見出しなし"><input aria-label="時間" data-i="${index}" data-k="time" value="${fmt(t.time)}"><input aria-label="内容" data-i="${index}" data-k="label" value="${attr(t.label)}"></div>`).join('');
    $('#saveTimestampsBtn').disabled=!rows.length;
    $$('#timestampPreview input').forEach(input=>input.onchange=()=>{
      const index=Number(input.dataset.i),key=input.dataset.k,row=state.parsedTimestamps[index];if(!row)return;
      if(key==='time'){const time=parseTime(input.value);if(time!=null)row.time=time}
      else if(key==='group'){row.group=input.value.trim();row.tags=guessTags(row.label,row.group,row.subtitle||'')}
      else{row.label=input.value.trim()||'タイムスタンプ';row.tags=guessTags(row.label,row.group||'',row.subtitle||'')}
    });
  }

  document.addEventListener('asmrtube:timestamps-render-request',renderTimestamps);
  document.addEventListener('asmrtube:player-time',event=>updatePlaybackHighlight(Number(event.detail?.currentTime)||0));
  document.addEventListener('asmrtube:timestamp-preview-request',renderTimestampPreview);

  renderTimestamps();
})();
