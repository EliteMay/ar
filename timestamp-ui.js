// Group-aware timestamp UI for ASMRTube v1.5
(function(){
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];

  const style=document.createElement('style');
  style.textContent=`
    .timestamp-group{margin:10px 4px 4px;padding:7px 8px 5px;border-top:1px solid var(--border);color:#e5defe;font-size:11px;font-weight:800;letter-spacing:.04em}
    .timestamp-group:first-child{margin-top:1px;border-top:0}
    .preview-grouped-row{display:grid;grid-template-columns:minmax(95px,.7fr) 82px minmax(0,1.5fr);gap:7px;align-items:center;border:1px solid var(--border);border-radius:10px;padding:7px;background:#0d1014}
    .preview-grouped-row input{margin:0;min-width:0}
    .preview-grouped-row input[data-k="group"]{color:#d7ccff}
    @media(max-width:620px){.preview-grouped-row{grid-template-columns:1fr 72px}.preview-grouped-row input[data-k="label"]{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  window.renderTimestamps=function(){
    const x=typeof itemById==='function'?itemById(state.selectedId):null;
    const view=$('#timestampView');
    const rows=x?.timestamps||[];
    if($('#timestampCount'))$('#timestampCount').textContent=rows.length;
    if(!x||!rows.length){
      view.className='timestamp-view empty';
      view.innerHTML='<div class="empty-copy"><strong>タイムスタンプなし</strong><span>コメント欄のタイムスタンプを貼り付けて登録できます。</span></div>';
      return;
    }

    rows.sort((a,b)=>a.time-b.time);
    view.className='timestamp-view';
    let lastGroup='';
    let html='';
    rows.forEach((t,i)=>{
      const group=String(t.group||'').trim();
      if(group&&group!==lastGroup)html+=`<div class="timestamp-group">${esc(group)}</div>`;
      lastGroup=group;
      html+=`<div class="timestamp-row" data-time="${t.time}">
        <button class="timestamp-time timestamp-jump" data-time="${t.time}" title="${attr(t.label)}">${fmt(t.time)}</button>
        <button class="timestamp-label timestamp-jump" data-time="${t.time}" title="${attr(t.label)}">${esc(t.label)}</button>
        <button class="timestamp-delete" data-index="${i}" title="削除">×</button>
      </div>`;
    });
    view.innerHTML=html;

    $$('.timestamp-jump').forEach(b=>b.onclick=()=>playItem(x.id,Number(b.dataset.time)));
    $$('.timestamp-delete').forEach(b=>b.onclick=()=>{
      x.timestamps.splice(Number(b.dataset.index),1);
      save();
      window.renderTimestamps();
      toast('タイムスタンプを削除しました');
    });
    if(typeof updateActiveTimestamp==='function')updateActiveTimestamp(state.player?.getCurrentTime?.()||0);
  };

  window.showTimestampPreview=function(){
    const rows=state.parsedTimestamps;
    $('#parseSummary').textContent=`${rows.length}件検出しました`;
    $('#timestampPreview').innerHTML=rows.map((t,i)=>`
      <div class="preview-grouped-row">
        <input aria-label="見出し" data-i="${i}" data-k="group" value="${attr(t.group||'')}" placeholder="見出し">
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

    // Re-importing the same comment should repair old parser mistakes instead of
    // stacking another row at the same second. Existing rows at imported times are replaced.
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
