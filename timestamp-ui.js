// Compact timestamp UI for ASMRTube v1.8
(function(){
  const VIEW_KEY='asmrtube.timestamp.view.v1';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  let chapterRanges=[];
  let lastActiveChapter=-1;
  let selectedChapter=-1;
  let viewMode=localStorage.getItem(VIEW_KEY)||'chapters';
  const expandedChapters=new Set();

  const style=document.createElement('style');
  style.textContent=`
    .timestamp-view-mode{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 9px;border-bottom:1px solid var(--border);background:rgba(10,11,14,.84);backdrop-filter:blur(10px)}
    .timestamp-view-tabs{display:flex;gap:4px;padding:3px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(255,255,255,.025)}
    .timestamp-view-tab{border:0;border-radius:6px;background:transparent;color:#858c98;padding:5px 9px;font-size:10px;font-weight:800;cursor:pointer}
    .timestamp-view-tab.active{background:rgba(139,92,246,.14);color:#eee9ff;box-shadow:inset 0 0 0 1px rgba(139,92,246,.12)}
    .timestamp-view-meta{color:#737986;font-size:9px;font-weight:700}

    .chapter-overview{padding:8px;display:grid;gap:8px}
    .chapter-overview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
    .chapter-card{min-width:0;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;gap:2px 7px;text-align:left;padding:8px 9px;border:1px solid rgba(255,255,255,.075);border-radius:9px;background:rgba(255,255,255,.025);color:#c2c7d0;cursor:pointer;transition:.14s ease}
    .chapter-card:hover{background:rgba(139,92,246,.075);border-color:rgba(139,92,246,.2);color:#eee9ff}
    .chapter-card.active,.chapter-card.selected{background:rgba(139,92,246,.13);border-color:rgba(139,92,246,.3);color:#f0ebff}
    .chapter-card-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:850}
    .chapter-card-time{grid-column:2;grid-row:1;color:#a58fff;font-size:9px;font-weight:850;font-variant-numeric:tabular-nums}
    .chapter-card-count{grid-column:1/-1;color:#6f7682;font-size:8px;font-weight:700}
    .chapter-other-card{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 9px;border:1px dashed rgba(255,255,255,.08);border-radius:8px;background:transparent;color:#868d99;cursor:pointer;font-size:9px;font-weight:750}
    .chapter-other-card:hover{border-color:rgba(139,92,246,.2);color:#cfc6ef;background:rgba(139,92,246,.045)}

    .chapter-focus{margin:0 8px 9px;border:1px solid rgba(139,92,246,.18);border-radius:10px;background:rgba(139,92,246,.035);overflow:hidden}
    .chapter-focus-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 9px;border-bottom:1px solid rgba(139,92,246,.14);background:rgba(139,92,246,.045)}
    .chapter-focus-title{min-width:0;display:grid;gap:1px}
    .chapter-focus-title strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ebe5ff;font-size:11px}
    .chapter-focus-title span{color:#777e89;font-size:8px;font-weight:700}
    .chapter-focus-play{border:1px solid rgba(139,92,246,.18);border-radius:7px;background:rgba(139,92,246,.1);color:#bcaeff;padding:5px 8px;font-size:9px;font-weight:850;cursor:pointer}
    .chapter-focus .timestamp-row{margin:0 4px;border-radius:7px}
    .chapter-focus .timestamp-row:last-child{margin-bottom:4px}

    .timestamp-all{padding:5px 6px 8px}
    .timestamp-block{margin:5px 0;border:1px solid rgba(139,92,246,.14);border-radius:9px;background:rgba(139,92,246,.025);overflow:hidden}
    .timestamp-block.active-group{border-color:rgba(139,92,246,.32);box-shadow:0 0 0 1px rgba(139,92,246,.06)}
    .timestamp-group-line{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:7px;padding:0;background:rgba(139,92,246,.04);border-bottom:1px solid transparent}
    .timestamp-block.open .timestamp-group-line{border-bottom-color:rgba(139,92,246,.12)}
    .timestamp-group-toggle{min-width:0;display:flex;align-items:center;gap:7px;border:0;background:transparent;color:#e3dcfa;padding:7px 8px;text-align:left;cursor:pointer;font-size:10px;font-weight:850}
    .timestamp-group-caret{display:inline-block;width:10px;color:#8377aa;font-size:8px;transition:transform .12s ease}
    .timestamp-block.open .timestamp-group-caret{transform:rotate(90deg)}
    .timestamp-group-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .timestamp-group-count{color:#6f7580;font-size:8px;font-weight:750}
    .timestamp-group-time{color:#9f8cff;font-size:9px;font-weight:850;font-variant-numeric:tabular-nums;padding:0 2px}
    .timestamp-group-play{margin-right:6px;border:0;border-radius:6px;background:rgba(139,92,246,.1);color:#bdafff;width:24px;height:22px;cursor:pointer;font-size:8px}
    .timestamp-group-body{display:none;padding-bottom:3px}
    .timestamp-block.open .timestamp-group-body{display:block}
    .timestamp-group-body .timestamp-row{margin:0 4px;border-radius:6px}
    .timestamp-standalone{margin:0}

    .timestamp-row{min-height:30px!important}
    .timestamp-time{min-width:50px!important;font-size:10px!important}
    .timestamp-label{font-size:10px!important;line-height:1.2!important}
    .timestamp-delete{opacity:.45!important}
    .timestamp-row:hover .timestamp-delete{opacity:1!important}

    .preview-grouped-row{display:grid;grid-template-columns:minmax(95px,.7fr) 82px minmax(0,1.5fr);gap:7px;align-items:center;border:1px solid var(--border);border-radius:10px;padding:7px;background:#0d1014}
    .preview-grouped-row input{margin:0;min-width:0}
    .preview-grouped-row input[data-k="group"]{color:#d7ccff}

    @media(max-width:620px){
      .chapter-overview-grid{grid-template-columns:1fr}
      .preview-grouped-row{grid-template-columns:1fr 72px}
      .preview-grouped-row input[data-k="label"]{grid-column:1/-1}
    }
  `;
  document.head.appendChild(style);

  function ensureModeBar(){
    let bar=$('#timestampViewMode');
    if(bar)return bar;
    const panel=$('.timestamp-panel'),head=panel?.querySelector('.timestamp-head');
    if(!panel||!head)return null;
    bar=document.createElement('div');
    bar.id='timestampViewMode';
    bar.className='timestamp-view-mode';
    bar.innerHTML=`<div class="timestamp-view-tabs">
      <button class="timestamp-view-tab" data-mode="chapters">見出し</button>
      <button class="timestamp-view-tab" data-mode="all">すべて</button>
    </div><div class="timestamp-view-meta" id="timestampViewMeta"></div>`;
    head.insertAdjacentElement('afterend',bar);
    bar.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
      viewMode=b.dataset.mode;
      localStorage.setItem(VIEW_KEY,viewMode);
      renderCurrentMode();
    });
    return bar;
  }

  function rowHtml(t,i,extraClass=''){
    return `<div class="timestamp-row ${extraClass}" data-time="${t.time}">
      <button class="timestamp-time timestamp-jump" data-time="${t.time}" title="${attr(t.label)}">${fmt(t.time)}</button>
      <button class="timestamp-label timestamp-jump" data-time="${t.time}" title="${attr(t.label)}">${esc(t.label)}</button>
      <button class="timestamp-delete" data-index="${i}" title="削除">×</button>
    </div>`;
  }

  function buildChapterRanges(rows){
    const result=[];
    for(let i=0;i<rows.length;){
      const group=String(rows[i].group||'').trim();
      if(!group){i++;continue}
      let j=i+1;
      while(j<rows.length&&String(rows[j].group||'').trim()===group)j++;
      result.push({
        name:group,
        start:Number(rows[i].time)||0,
        end:j<rows.length?Number(rows[j].time):Infinity,
        rowStart:i,
        rowEnd:j-1,
        count:j-i,
        index:result.length
      });
      i=j;
    }
    return result;
  }

  function getCurrentItem(){return typeof itemById==='function'?itemById(state.selectedId):null}

  function getActiveChapter(currentTime){
    const t=Number(currentTime)||0;
    let active=-1;
    chapterRanges.forEach((c,i)=>{if(t>=c.start&&t<c.end)active=i});
    return active;
  }

  function playAt(time){
    const x=getCurrentItem();
    if(!x)return;
    if(state.player?.seekTo&&state.currentId===x.id){
      state.player.seekTo(Number(time)||0,true);
      state.player.playVideo?.();
      if(typeof markRecent==='function')markRecent(x.id);
    }else{
      playItem(x.id,Number(time)||0);
    }
  }

  function selectChapter(index,{play=false}={}){
    if(!chapterRanges[index])return;
    selectedChapter=index;
    if(play)playAt(chapterRanges[index].start);
    renderCurrentMode();
  }

  function bindCommonActions(){
    const x=getCurrentItem();
    if(!x)return;
    $$('.timestamp-jump').forEach(b=>b.onclick=()=>playItem(x.id,Number(b.dataset.time)));
    $$('.timestamp-delete').forEach(b=>b.onclick=()=>{
      x.timestamps.splice(Number(b.dataset.index),1);
      save();
      window.renderTimestamps();
      toast('タイムスタンプを削除しました');
    });
  }

  function renderChapterMode(rows){
    const view=$('#timestampView');
    const standaloneCount=rows.filter(r=>!String(r.group||'').trim()).length;
    if(!chapterRanges.length){
      view.innerHTML=`<div class="chapter-overview"><div class="empty-copy"><strong>見出しがありません</strong><span>この動画は見出しグループがないため「すべて」で確認できます。</span></div><button class="chapter-other-card" id="openAllTimestamps"><span>すべてのタイムスタンプを見る</span><span>${rows.length}件</span></button></div>`;
      $('#openAllTimestamps').onclick=()=>{viewMode='all';localStorage.setItem(VIEW_KEY,viewMode);renderCurrentMode()};
      return;
    }

    if(selectedChapter<0||!chapterRanges[selectedChapter])selectedChapter=Math.max(0,getActiveChapter(state.player?.getCurrentTime?.()||0));
    const selected=chapterRanges[selectedChapter];
    const active=getActiveChapter(state.player?.getCurrentTime?.()||0);

    let html='<div class="chapter-overview"><div class="chapter-overview-grid">';
    chapterRanges.forEach((c,i)=>{
      html+=`<button class="chapter-card ${i===active?'active':''} ${i===selectedChapter?'selected':''}" data-select-chapter="${i}">
        <span class="chapter-card-name">${esc(c.name)}</span><span class="chapter-card-time">${fmt(c.start)}</span><span class="chapter-card-count">${c.count}項目</span>
      </button>`;
    });
    if(standaloneCount){
      html+=`<button class="chapter-other-card" id="openAllTimestamps"><span>その他のタイムスタンプ</span><span>${standaloneCount}件 →</span></button>`;
    }
    html+='</div></div>';

    if(selected){
      html+=`<div class="chapter-focus">
        <div class="chapter-focus-head"><div class="chapter-focus-title"><strong>${esc(selected.name)}</strong><span>${fmt(selected.start)} ・ ${selected.count}項目</span></div><button class="chapter-focus-play" data-play-chapter="${selectedChapter}">▶ ここから再生</button></div>`;
      for(let i=selected.rowStart;i<=selected.rowEnd;i++)html+=rowHtml(rows[i],i);
      html+='</div>';
    }

    view.innerHTML=html;
    $$('[data-select-chapter]').forEach(b=>b.onclick=()=>selectChapter(Number(b.dataset.selectChapter),{play:true}));
    $$('[data-play-chapter]').forEach(b=>b.onclick=()=>playAt(chapterRanges[Number(b.dataset.playChapter)]?.start||0));
    $('#openAllTimestamps')?.addEventListener('click',()=>{viewMode='all';localStorage.setItem(VIEW_KEY,viewMode);renderCurrentMode()});
    bindCommonActions();
  }

  function renderAllMode(rows){
    const view=$('#timestampView');
    const active=getActiveChapter(state.player?.getCurrentTime?.()||0);
    let html='<div class="timestamp-all">';
    let chapterIndex=0;

    for(let i=0;i<rows.length;){
      const group=String(rows[i].group||'').trim();
      if(group){
        const c=chapterRanges[chapterIndex];
        const open=expandedChapters.has(chapterIndex)||chapterIndex===active||chapterIndex===selectedChapter;
        html+=`<div class="timestamp-block ${open?'open':''} ${chapterIndex===active?'active-group':''}" data-chapter-index="${chapterIndex}">
          <div class="timestamp-group-line">
            <button class="timestamp-group-toggle" data-toggle-chapter="${chapterIndex}"><span class="timestamp-group-caret">▶</span><span class="timestamp-group-name">${esc(group)}</span><span class="timestamp-group-count">${c.count}</span></button>
            <span class="timestamp-group-time">${fmt(c.start)}</span>
            <button class="timestamp-group-play" data-play-chapter="${chapterIndex}" title="${attr(group)}の先頭から再生">▶</button>
          </div><div class="timestamp-group-body">`;
        let j=i;
        while(j<rows.length&&String(rows[j].group||'').trim()===group){html+=rowHtml(rows[j],j);j++}
        html+='</div></div>';
        chapterIndex++;
        i=j;
      }else{
        html+=rowHtml(rows[i],i,'timestamp-standalone');
        i++;
      }
    }
    html+='</div>';
    view.innerHTML=html;

    $$('[data-toggle-chapter]').forEach(b=>b.onclick=()=>{
      const i=Number(b.dataset.toggleChapter);
      if(expandedChapters.has(i))expandedChapters.delete(i);else expandedChapters.add(i);
      selectedChapter=i;
      renderCurrentMode();
    });
    $$('[data-play-chapter]').forEach(b=>b.onclick=()=>{
      const i=Number(b.dataset.playChapter);selectedChapter=i;expandedChapters.add(i);playAt(chapterRanges[i]?.start||0);renderCurrentMode();
    });
    bindCommonActions();
  }

  function renderCurrentMode(){
    const x=getCurrentItem();
    const view=$('#timestampView');
    const rows=x?.timestamps||[];
    ensureModeBar();
    $$('.timestamp-view-tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===viewMode));
    const meta=$('#timestampViewMeta');
    if(meta)meta.textContent=viewMode==='chapters'?`${chapterRanges.length}見出し`:`${rows.length}件`;

    if(!x||!rows.length){
      view.className='timestamp-view empty';
      view.innerHTML='<div class="empty-copy"><strong>タイムスタンプなし</strong><span>コメント欄のタイムスタンプを貼り付けて登録できます。</span></div>';
      return;
    }

    view.className='timestamp-view';
    if(viewMode==='chapters')renderChapterMode(rows);else renderAllMode(rows);
  }

  window.renderTimestamps=function(){
    const x=getCurrentItem();
    const rows=x?.timestamps||[];
    if($('#timestampCount'))$('#timestampCount').textContent=rows.length;
    if(rows.length)rows.sort((a,b)=>a.time-b.time);
    chapterRanges=buildChapterRanges(rows);
    selectedChapter=-1;
    lastActiveChapter=-1;
    expandedChapters.clear();
    renderCurrentMode();
  };

  const originalUpdateActiveTimestamp=window.updateActiveTimestamp;
  window.updateActiveTimestamp=function(currentTime){
    if(typeof originalUpdateActiveTimestamp==='function')originalUpdateActiveTimestamp(currentTime);
    const active=getActiveChapter(currentTime);
    if(active!==lastActiveChapter){
      lastActiveChapter=active;
      if(active>=0){
        selectedChapter=active;
        expandedChapters.add(active);
        if(viewMode==='chapters')renderCurrentMode();
        else{
          $$('.timestamp-block').forEach(b=>b.classList.toggle('active-group',Number(b.dataset.chapterIndex)===active));
        }
      }else{
        $$('.timestamp-block').forEach(b=>b.classList.remove('active-group'));
      }
    }
  };

  window.showTimestampPreview=function(){
    const rows=state.parsedTimestamps;
    $('#parseSummary').textContent=`${rows.length}件検出しました`;
    $('#timestampPreview').innerHTML=rows.map((t,i)=>`
      <div class="preview-grouped-row">
        <input aria-label="見出し" data-i="${i}" data-k="group" value="${attr(t.group||'')}" placeholder="見出しなし">
        <input aria-label="時間" data-i="${i}" data-k="time" value="${fmt(t.time)}">
        <input aria-label="内容" data-i="${i}" data-k="label" value="${attr(t.label)}">
      </div>`).join('');
    $('#saveTimestampsBtn').disabled=!rows.length;
    $$('#timestampPreview input').forEach(el=>el.onchange=()=>{
      const i=Number(el.dataset.i),key=el.dataset.k;
      if(key==='time'){
        const n=parseTime(el.value);if(n!=null)state.parsedTimestamps[i].time=n;
      }else if(key==='group'){
        state.parsedTimestamps[i].group=el.value.trim();
        state.parsedTimestamps[i].tags=guessTags(state.parsedTimestamps[i].label,state.parsedTimestamps[i].group);
      }else{
        state.parsedTimestamps[i].label=el.value.trim()||'タイムスタンプ';
        state.parsedTimestamps[i].tags=guessTags(state.parsedTimestamps[i].label,state.parsedTimestamps[i].group||'');
      }
    });
  };

  function saveGroupedTimestamps(){
    const x=itemById(state.selectedId);if(!x)return;
    x.timestamps=x.timestamps||[];
    const importedTimes=new Set(state.parsedTimestamps.map(t=>Number(t.time)));
    const before=x.timestamps.length;
    x.timestamps=x.timestamps.filter(t=>!importedTimes.has(Number(t.time)));
    const removed=before-x.timestamps.length;

    for(const t of state.parsedTimestamps){
      const group=String(t.group||'').trim();
      if(!x.timestamps.some(z=>z.time===t.time&&z.label===t.label&&String(z.group||'')===group))x.timestamps.push({...t,group});
    }
    x.timestamps.sort((a,b)=>a.time-b.time);
    save();
    $('#timestampDialog').close();
    window.renderTimestamps();
    renderFilters();
    toast(removed?`タイムスタンプを再解析して${removed}件置き換えました`:'タイムスタンプを追加しました');
  }

  const saveBtn=$('#saveTimestampsBtn');
  if(saveBtn)saveBtn.onclick=saveGroupedTimestamps;
})();
