// ASMRTube timestamp UI — canonical global renderer.
(function(){
  'use strict';

  const VIEW_KEY='asmrtube.timestamp.view.v1';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const parser=()=>window.ASMRTubeTimestampParser||null;

  let chapterRanges=[];
  let selectedChapter=-1;
  let lastActiveChapter=-1;
  let viewMode='chapters';
  const expandedChapters=new Set();

  try{viewMode=localStorage.getItem(VIEW_KEY)||'chapters'}catch{}
  function persistMode(){try{localStorage.setItem(VIEW_KEY,viewMode)}catch{}}
  function currentItem(){try{return typeof itemById==='function'?itemById(state.selectedId):null}catch{return null}}

  function ensureModeBar(){
    let bar=$('#timestampViewMode');
    if(bar)return bar;
    const panel=$('.timestamp-panel'),head=panel?.querySelector('.timestamp-head');
    if(!panel||!head)return null;
    bar=document.createElement('div');
    bar.id='timestampViewMode';
    bar.className='timestamp-view-mode';
    bar.innerHTML='<div class="timestamp-view-tabs"><button type="button" class="timestamp-view-tab" data-mode="chapters">見出し</button><button type="button" class="timestamp-view-tab" data-mode="all">すべて</button></div><div class="timestamp-view-meta" id="timestampViewMeta"></div>';
    head.insertAdjacentElement('afterend',bar);
    bar.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
      viewMode=button.dataset.mode==='all'?'all':'chapters';
      persistMode();
      renderCurrentMode();
    }));
    return bar;
  }

  function roleClass(row){
    if(row.role==='parent')return 'timestamp-role-parent';
    if(row.role==='child')return 'timestamp-role-child';
    return '';
  }

  function rowHtml(row,index,extra=''){
    const time=Number(row.time)||0;
    const parentBadge=row.role==='parent'?'<span class="timestamp-role-badge">親</span>':'';
    const subtitle=row.subtitle?`<span class="timestamp-subtitle">${esc(row.subtitle)}</span>`:'';
    const title=row.role==='child'&&row.parentLabel?`親: ${row.parentLabel}`:row.label;
    return `<div class="timestamp-row ${roleClass(row)} ${extra}" data-time="${time}" data-polished-v21="1"${title?` title="${attr(title)}"`:''}>
      <button type="button" class="timestamp-time timestamp-jump" data-time="${time}">${fmt(time)}</button>
      <button type="button" class="timestamp-label timestamp-jump" data-time="${time}"><span>${esc(row.label||'タイムスタンプ')}</span>${parentBadge}${subtitle}</button>
      <button type="button" class="timestamp-delete" data-index="${index}" title="削除" aria-label="${attr(row.label||'タイムスタンプ')}を削除">×</button>
    </div>`;
  }

  function buildRanges(rows){
    const ranges=[];
    for(let i=0;i<rows.length;){
      const group=String(rows[i].group||'').trim();
      if(!group){i++;continue}
      let end=i+1;
      while(end<rows.length&&String(rows[end].group||'').trim()===group)end++;
      ranges.push({
        name:group,
        start:Number(rows[i].time)||0,
        end:end<rows.length?Number(rows[end].time):Infinity,
        rowStart:i,
        rowEnd:end-1,
        count:end-i,
        index:ranges.length
      });
      i=end;
    }
    return ranges;
  }

  function activeChapterAt(currentTime){
    const time=Number(currentTime)||0;
    let active=-1;
    chapterRanges.forEach((chapter,index)=>{if(time>=chapter.start&&time<chapter.end)active=index});
    return active;
  }

  function playAt(time){
    const item=currentItem();
    if(!item)return;
    playItem(item.id,Number(time)||0);
  }

  function bindRows(){
    const item=currentItem();
    if(!item)return;
    $$('.timestamp-jump').forEach(button=>button.onclick=()=>playAt(Number(button.dataset.time)||0));
    $$('.timestamp-delete').forEach(button=>button.onclick=()=>{
      const index=Number(button.dataset.index);
      if(!Number.isInteger(index)||index<0||index>=item.timestamps.length)return;
      item.timestamps.splice(index,1);
      save();
      window.renderTimestamps();
      toast('タイムスタンプを削除しました');
    });
  }

  function parentOverviewHtml(rows){
    const parents=rows.filter(row=>row.role==='parent');
    if(!parents.length)return '';
    return `<div class="role-parent-overview" id="roleParentOverview"><div class="role-parent-head"><strong>親タイムスタンプ</strong><span>${parents.length}件</span></div><div class="role-parent-grid">${parents.map(parent=>{
      const children=rows.filter(row=>row.role==='child'&&Number(row.parentTime)===Number(parent.time)).length;
      return `<button type="button" class="role-parent-card" data-parent-time="${Number(parent.time)||0}"><span class="role-parent-name">${esc(parent.label||'親')}</span><span class="role-parent-time">${fmt(parent.time)}</span><small>${children?`${children}子項目`:'親タイムスタンプ'}</small></button>`;
    }).join('')}</div></div>`;
  }

  function bindParentOverview(){
    $$('[data-parent-time]').forEach(button=>button.onclick=()=>playAt(Number(button.dataset.parentTime)||0));
  }

  function renderChapterMode(rows){
    const view=$('#timestampView');
    const parentHtml=parentOverviewHtml(rows);
    const standaloneCount=rows.filter(row=>!String(row.group||'').trim()).length;

    if(!chapterRanges.length){
      view.innerHTML=`<div class="chapter-overview">${parentHtml}<div class="empty-copy"><strong>${parentHtml?'大見出しはありません':'見出しはありません'}</strong><span>${parentHtml?'親タイムスタンプから直接移動できます。':'この動画は時系列一覧の方が見やすい構成です。'}</span></div><button type="button" class="chapter-other-card" id="openAllTimestamps"><span>すべてのタイムスタンプ</span><span>${rows.length}件 →</span></button></div>`;
      bindParentOverview();
      $('#openAllTimestamps')?.addEventListener('click',()=>{viewMode='all';persistMode();renderCurrentMode()});
      return;
    }

    const active=activeChapterAt(state.player?.getCurrentTime?.()||0);
    if(selectedChapter<0||!chapterRanges[selectedChapter])selectedChapter=active>=0?active:0;
    const selected=chapterRanges[selectedChapter];

    let html='<div class="chapter-overview">';
    if(parentHtml)html+=parentHtml;
    html+='<div class="chapter-overview-grid">';
    chapterRanges.forEach((chapter,index)=>{
      html+=`<button type="button" class="chapter-card ${index===active?'active':''} ${index===selectedChapter?'selected':''}" data-select-chapter="${index}"><span class="chapter-card-name">${esc(chapter.name)}</span><span class="chapter-card-time">${fmt(chapter.start)}</span><span class="chapter-card-count">${chapter.count}項目</span></button>`;
    });
    if(standaloneCount)html+=`<button type="button" class="chapter-other-card" id="openAllTimestamps"><span>その他のタイムスタンプ</span><span>${standaloneCount}件 →</span></button>`;
    html+='</div></div>';

    if(selected){
      html+=`<div class="chapter-focus"><div class="chapter-focus-head"><div class="chapter-focus-title"><strong>${esc(selected.name)}</strong><span>${fmt(selected.start)} ・ ${selected.count}項目</span></div><button type="button" class="chapter-focus-play" data-focus-play="${selectedChapter}">▶ ここから再生</button></div>`;
      for(let i=selected.rowStart;i<=selected.rowEnd;i++)html+=rowHtml(rows[i],i);
      html+='</div>';
    }

    view.innerHTML=html;
    bindParentOverview();
    $$('[data-select-chapter]').forEach(button=>button.onclick=()=>{
      selectedChapter=Number(button.dataset.selectChapter);
      playAt(chapterRanges[selectedChapter]?.start||0);
      renderCurrentMode();
    });
    $('[data-focus-play]')?.addEventListener('click',event=>playAt(chapterRanges[Number(event.currentTarget.dataset.focusPlay)]?.start||0));
    $('#openAllTimestamps')?.addEventListener('click',()=>{viewMode='all';persistMode();renderCurrentMode()});
    bindRows();
  }

  function renderAllMode(rows){
    const view=$('#timestampView');
    const active=activeChapterAt(state.player?.getCurrentTime?.()||0);
    let html='<div class="timestamp-all">';
    let chapterIndex=0;

    for(let i=0;i<rows.length;){
      const group=String(rows[i].group||'').trim();
      if(!group){html+=rowHtml(rows[i],i,'timestamp-standalone');i++;continue}

      const chapter=chapterRanges[chapterIndex];
      const open=expandedChapters.has(chapterIndex)||chapterIndex===active;
      html+=`<div class="timestamp-block ${open?'open':''} ${chapterIndex===active?'active-group':''}" data-chapter-index="${chapterIndex}">
        <div class="timestamp-group-line"><button type="button" class="timestamp-group-toggle" data-toggle-chapter="${chapterIndex}" aria-expanded="${open}"><span class="timestamp-group-caret">▶</span><span class="timestamp-group-name">${esc(group)}</span><span class="timestamp-group-count">${chapter.count}</span></button><span class="timestamp-group-time">${fmt(chapter.start)}</span><button type="button" class="timestamp-group-play" data-play-chapter="${chapterIndex}" title="${attr(group)}の先頭から再生">▶</button></div><div class="timestamp-group-body">`;
      let j=i;
      while(j<rows.length&&String(rows[j].group||'').trim()===group){html+=rowHtml(rows[j],j);j++}
      html+='</div></div>';
      chapterIndex++;
      i=j;
    }

    html+='</div>';
    view.innerHTML=html;
    $$('[data-toggle-chapter]').forEach(button=>button.onclick=()=>{
      const index=Number(button.dataset.toggleChapter);
      expandedChapters.has(index)?expandedChapters.delete(index):expandedChapters.add(index);
      selectedChapter=index;
      renderCurrentMode();
    });
    $$('[data-play-chapter]').forEach(button=>button.onclick=()=>{
      const index=Number(button.dataset.playChapter);
      selectedChapter=index;
      expandedChapters.add(index);
      playAt(chapterRanges[index]?.start||0);
      renderCurrentMode();
    });
    bindRows();
  }

  function updateRows(currentTime){
    const domRows=$$('.timestamp-row');
    if(!domRows.length||state.currentId!==state.selectedId){domRows.forEach(row=>row.classList.remove('active'));return}
    let active=-1;
    domRows.forEach((row,index)=>{if(Number(row.dataset.time)<=Number(currentTime||0))active=index});
    domRows.forEach((row,index)=>row.classList.toggle('active',index===active));
  }

  function updateActive(currentTime){
    updateRows(currentTime);
    const active=activeChapterAt(currentTime);
    if(active===lastActiveChapter)return;
    lastActiveChapter=active;
    if(active>=0){selectedChapter=active;expandedChapters.add(active)}
    if(viewMode==='chapters'&&chapterRanges.length){renderCurrentMode();return}
    $$('.timestamp-block').forEach(block=>{
      const isActive=Number(block.dataset.chapterIndex)===active;
      block.classList.toggle('active-group',isActive);
      if(isActive){block.classList.add('open');block.querySelector('.timestamp-group-toggle')?.setAttribute('aria-expanded','true')}
    });
  }

  function renderCurrentMode(){
    const item=currentItem(),rows=item?.timestamps||[],view=$('#timestampView');
    if(!view)return;
    ensureModeBar();
    $$('.timestamp-view-tab').forEach(button=>button.classList.toggle('active',button.dataset.mode===viewMode));
    const meta=$('#timestampViewMeta');
    if(meta)meta.textContent=viewMode==='chapters'?`${chapterRanges.length}見出し`:`${rows.length}件`;

    if(!item||!rows.length){
      view.className='timestamp-view empty';
      view.innerHTML='<div class="empty-copy"><strong>タイムスタンプなし</strong><span>コメント欄のタイムスタンプを貼り付けると、音の場所をすぐ探せます。</span></div>';
      return;
    }

    view.className='timestamp-view';
    if(viewMode==='all')renderAllMode(rows);else renderChapterMode(rows);
    updateRows(state.player?.getCurrentTime?.()||0);
  }

  function renderTimestampsV3(){
    const item=currentItem(),rows=item?.timestamps||[];
    if($('#timestampCount'))$('#timestampCount').textContent=rows.length;
    rows.sort((a,b)=>Number(a.time)-Number(b.time));
    chapterRanges=buildRanges(rows);
    selectedChapter=-1;
    lastActiveChapter=-1;
    expandedChapters.clear();
    renderCurrentMode();
    document.dispatchEvent(new CustomEvent('asmrtube:timestamps-rendered',{detail:{item,rows}}));
  }

  function renderPreviewV3(){
    const rows=state.parsedTimestamps||[];
    if($('#parseSummary'))$('#parseSummary').textContent=rows.length?`${rows.length}件検出しました`:'タイムスタンプを検出できませんでした';
    const preview=$('#timestampPreview');
    if(!preview)return;
    preview.innerHTML=rows.map((row,index)=>`<div class="preview-grouped-row"><input aria-label="見出し" data-i="${index}" data-k="group" value="${attr(row.group||'')}" placeholder="見出しなし"><input aria-label="時間" data-i="${index}" data-k="time" value="${fmt(row.time)}"><input aria-label="内容" data-i="${index}" data-k="label" value="${attr(row.label||'タイムスタンプ')}"></div>`).join('');
    if($('#saveTimestampsBtn'))$('#saveTimestampsBtn').disabled=!rows.length;
    $$('#timestampPreview input').forEach(input=>input.onchange=()=>{
      const index=Number(input.dataset.i),key=input.dataset.k,row=rows[index];
      if(!row)return;
      if(key==='time'){
        const value=(parser()?.parseTime||parseTime)(input.value);
        if(value!=null)row.time=value;
      }else if(key==='group')row.group=input.value.trim();
      else row.label=input.value.trim()||'タイムスタンプ';
      const guess=parser()?.guessTags;
      if(typeof guess==='function')row.tags=guess(row.label,row.group||'',row.subtitle||'');
    });
  }

  // Replace the legacy app renderer through the classic-script global binding.
  window.renderTimestamps=renderTimestampsV3;
  window.updateActiveTimestamp=updateActive;
  window.showTimestampPreview=renderPreviewV3;

  renderTimestampsV3();
})();
