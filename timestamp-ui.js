// Group-aware timestamp UI for ASMRTube v1.7
(function(){
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  let chapterRanges=[];
  let lastActiveChapter=-1;

  const style=document.createElement('style');
  style.textContent=`
    .timestamp-chapter-nav{display:none;padding:8px 9px 7px;border-bottom:1px solid var(--border);background:rgba(10,11,14,.84);backdrop-filter:blur(10px)}
    .timestamp-chapter-nav.show{display:block}
    .timestamp-chapter-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 2px 6px;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    .timestamp-chapter-title span:last-child{font-size:9px;font-weight:600;letter-spacing:0;text-transform:none;color:#777d89}
    .timestamp-chapter-scroll{display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;padding:1px 1px 4px;scrollbar-width:thin;scroll-snap-type:x proximity}
    .timestamp-chapter-btn{flex:0 0 auto;display:flex;align-items:center;gap:6px;max-width:170px;padding:6px 8px;border:1px solid rgba(255,255,255,.075);border-radius:8px;background:rgba(255,255,255,.025);color:#b7bdc7;cursor:pointer;scroll-snap-align:start;transition:background .14s ease,border-color .14s ease,color .14s ease,transform .14s ease}
    .timestamp-chapter-btn:hover{background:rgba(139,92,246,.085);border-color:rgba(139,92,246,.22);color:#e7e0ff}
    .timestamp-chapter-btn:active{transform:translateY(1px)}
    .timestamp-chapter-btn.active{background:rgba(139,92,246,.14);border-color:rgba(139,92,246,.32);color:#efeaff;box-shadow:inset 0 0 0 1px rgba(139,92,246,.06)}
    .timestamp-chapter-name{max-width:105px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:800}
    .timestamp-chapter-time{font-size:9px;font-weight:800;color:#9f8cff;font-variant-numeric:tabular-nums}
    .timestamp-block{margin:7px 2px 10px;border:1px solid rgba(139,92,246,.18);border-radius:10px;background:rgba(139,92,246,.035);overflow:hidden;scroll-margin-top:8px}
    .timestamp-block.active-group{border-color:rgba(139,92,246,.34);box-shadow:0 0 0 1px rgba(139,92,246,.07),0 8px 24px rgba(0,0,0,.08)}
    .timestamp-group{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0;padding:8px 10px 6px;border:0;border-bottom:1px solid rgba(139,92,246,.16);color:#e5defe;font-size:11px;font-weight:800;letter-spacing:.04em;background:rgba(139,92,246,.045);cursor:pointer;text-align:left}
    .timestamp-group:hover{background:rgba(139,92,246,.085)}
    .timestamp-group-main{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .timestamp-group-meta{display:flex;align-items:center;gap:6px;flex:0 0 auto;color:#9f8cff;font-size:9px;font-weight:800;letter-spacing:0;font-variant-numeric:tabular-nums}
    .timestamp-group-play{display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:rgba(139,92,246,.14);font-size:7px}
    .timestamp-block .timestamp-row{margin:0 4px;border-radius:7px}
    .timestamp-block .timestamp-row:last-child{margin-bottom:4px}
    .timestamp-standalone{margin:1px 0}
    .timestamp-block + .timestamp-standalone,.timestamp-standalone + .timestamp-block{margin-top:9px}
    .timestamp-block + .timestamp-standalone{border-top:1px solid rgba(255,255,255,.055);padding-top:6px}
    .preview-grouped-row{display:grid;grid-template-columns:minmax(95px,.7fr) 82px minmax(0,1.5fr);gap:7px;align-items:center;border:1px solid var(--border);border-radius:10px;padding:7px;background:#0d1014}
    .preview-grouped-row input{margin:0;min-width:0}
    .preview-grouped-row input[data-k="group"]{color:#d7ccff}
    @media(max-width:620px){.preview-grouped-row{grid-template-columns:1fr 72px}.preview-grouped-row input[data-k="label"]{grid-column:1/-1}.timestamp-chapter-btn{max-width:145px}.timestamp-chapter-name{max-width:86px}}
  `;
  document.head.appendChild(style);

  function ensureChapterNav(){
    let nav=$('#timestampChapterNav');
    if(nav)return nav;
    const panel=$('.timestamp-panel'),head=panel?.querySelector('.timestamp-head');
    if(!panel||!head)return null;
    nav=document.createElement('div');
    nav.id='timestampChapterNav';
    nav.className='timestamp-chapter-nav';
    nav.innerHTML='<div class="timestamp-chapter-title"><span>見出しジャンプ</span><span id="chapterNavCount"></span></div><div class="timestamp-chapter-scroll" id="timestampChapterScroll"></div>';
    head.insertAdjacentElement('afterend',nav);
    return nav;
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
      result.push({name:group,start:Number(rows[i].time)||0,end:j<rows.length?Number(rows[j].time):Infinity,rowStart:i,rowEnd:j-1,index:result.length});
      i=j;
    }
    return result;
  }

  function jumpToChapter(index,{play=true}={}){
    const chapter=chapterRanges[index];
    const x=typeof itemById==='function'?itemById(state.selectedId):null;
    if(!chapter||!x)return;

    if(play){
      if(state.player?.seekTo&&state.currentId===x.id){
        state.player.seekTo(chapter.start,true);
        state.player.playVideo?.();
        markRecent?.(x.id);
      }else{
        playItem(x.id,chapter.start);
      }
    }

    requestAnimationFrame(()=>{
      const block=document.querySelector(`.timestamp-block[data-chapter-index="${index}"]`);
      block?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  function renderChapterNav(){
    const nav=ensureChapterNav();
    if(!nav)return;
    const scroll=$('#timestampChapterScroll');
    const count=$('#chapterNavCount');
    if(!chapterRanges.length){
      nav.classList.remove('show');
      if(scroll)scroll.innerHTML='';
      if(count)count.textContent='';
      return;
    }
    nav.classList.add('show');
    if(count)count.textContent=`${chapterRanges.length}件`;
    scroll.innerHTML=chapterRanges.map((c,i)=>`<button class="timestamp-chapter-btn" data-chapter-index="${i}" title="${attr(c.name)} ${fmt(c.start)}"><span class="timestamp-chapter-name">${esc(c.name)}</span><span class="timestamp-chapter-time">${fmt(c.start)}</span></button>`).join('');
    $$('.timestamp-chapter-btn').forEach(b=>b.onclick=()=>jumpToChapter(Number(b.dataset.chapterIndex)));
  }

  function updateChapterNavActive(currentTime){
    const t=Number(currentTime)||0;
    let active=-1;
    chapterRanges.forEach((c,i)=>{if(t>=c.start&&t<c.end)active=i});
    $$('.timestamp-chapter-btn').forEach((b,i)=>b.classList.toggle('active',i===active));
    $$('.timestamp-block').forEach(b=>b.classList.toggle('active-group',Number(b.dataset.chapterIndex)===active));
    if(active!==lastActiveChapter){
      lastActiveChapter=active;
      if(active>=0){
        const btn=document.querySelector(`.timestamp-chapter-btn[data-chapter-index="${active}"]`);
        btn?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
      }
    }
  }

  window.renderTimestamps=function(){
    const x=typeof itemById==='function'?itemById(state.selectedId):null;
    const view=$('#timestampView');
    const rows=x?.timestamps||[];
    if($('#timestampCount'))$('#timestampCount').textContent=rows.length;
    if(!x||!rows.length){
      chapterRanges=[];lastActiveChapter=-1;renderChapterNav();
      view.className='timestamp-view empty';
      view.innerHTML='<div class="empty-copy"><strong>タイムスタンプなし</strong><span>コメント欄のタイムスタンプを貼り付けて登録できます。</span></div>';
      return;
    }

    rows.sort((a,b)=>a.time-b.time);
    chapterRanges=buildChapterRanges(rows);
    lastActiveChapter=-1;
    renderChapterNav();
    view.className='timestamp-view';
    let html='';
    let chapterIndex=0;

    for(let i=0;i<rows.length;){
      const group=String(rows[i].group||'').trim();
      if(group){
        const start=Number(rows[i].time)||0;
        html+=`<div class="timestamp-block" data-chapter-index="${chapterIndex}"><button class="timestamp-group timestamp-group-jump" data-chapter-index="${chapterIndex}" title="${attr(group)}の先頭へ"><span class="timestamp-group-main">${esc(group)}</span><span class="timestamp-group-meta"><span>${fmt(start)}</span><span class="timestamp-group-play">▶</span></span></button>`;
        let j=i;
        while(j<rows.length&&String(rows[j].group||'').trim()===group){
          html+=rowHtml(rows[j],j);
          j++;
        }
        html+='</div>';
        chapterIndex++;
        i=j;
      }else{
        html+=rowHtml(rows[i],i,'timestamp-standalone');
        i++;
      }
    }

    view.innerHTML=html;
    $$('.timestamp-jump').forEach(b=>b.onclick=()=>playItem(x.id,Number(b.dataset.time)));
    $$('.timestamp-group-jump').forEach(b=>b.onclick=()=>jumpToChapter(Number(b.dataset.chapterIndex)));
    $$('.timestamp-delete').forEach(b=>b.onclick=()=>{
      x.timestamps.splice(Number(b.dataset.index),1);
      save();
      window.renderTimestamps();
      toast('タイムスタンプを削除しました');
    });
    if(typeof updateActiveTimestamp==='function')updateActiveTimestamp(state.player?.getCurrentTime?.()||0);
    updateChapterNavActive(state.player?.getCurrentTime?.()||0);
  };

  const originalUpdateActiveTimestamp=window.updateActiveTimestamp;
  window.updateActiveTimestamp=function(currentTime){
    if(typeof originalUpdateActiveTimestamp==='function')originalUpdateActiveTimestamp(currentTime);
    updateChapterNavActive(currentTime);
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
