// ASMRTube v2.1 — visual polish for role/subtitle aware timestamps
(function(){
  'use strict';
  const view=document.querySelector('#timestampView');
  if(!view)return;
  const escText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function currentItem(){
    try{return typeof itemById==='function'?itemById(state.selectedId):null}catch{return null}
  }

  function findSourceRow(domRow,rows){
    const time=Number(domRow.dataset.time);
    const label=domRow.querySelector('.timestamp-label')?.childNodes?.[0]?.textContent?.trim()||domRow.querySelector('.timestamp-label')?.textContent?.trim()||'';
    const same=rows.filter(row=>Number(row.time)===time);
    return same.find(row=>String(row.label||'').trim()===label)||same[0]||null;
  }

  function enhanceRows(rows){
    [...view.querySelectorAll('.timestamp-row')].forEach(domRow=>{
      if(domRow.dataset.polishedV21==='1')return;
      const source=findSourceRow(domRow,rows);if(!source)return;
      domRow.dataset.polishedV21='1';
      const label=domRow.querySelector('.timestamp-label');if(!label)return;
      const role=String(source.role||'item');
      if(role==='parent'){
        domRow.classList.add('timestamp-role-parent');
        const badge=document.createElement('span');badge.className='timestamp-role-badge';badge.textContent='親';label.appendChild(badge);
      }else if(role==='child'){
        domRow.classList.add('timestamp-role-child');
        if(source.parentLabel)domRow.title=`親: ${source.parentLabel}`;
      }
      if(source.subtitle){
        const subtitle=document.createElement('span');subtitle.className='timestamp-subtitle';subtitle.textContent=source.subtitle;label.appendChild(subtitle);
      }
    });
  }

  function enhanceParentOverview(rows){
    const parents=rows.filter(row=>row.role==='parent');
    if(!parents.length)return;
    const overview=view.querySelector('.chapter-overview');
    if(!overview||overview.querySelector('.chapter-card')||overview.querySelector('#roleParentOverview'))return;
    const box=document.createElement('div');box.id='roleParentOverview';box.className='role-parent-overview';
    box.innerHTML=`<div class="role-parent-head"><strong>親タイムスタンプ</strong><span>${parents.length}件</span></div><div class="role-parent-grid">${parents.map(parent=>{
      const count=rows.filter(row=>row.role==='child'&&Number(row.parentTime)===Number(parent.time)).length;
      return `<button type="button" class="role-parent-card" data-parent-time="${Number(parent.time)||0}"><span class="role-parent-name">${escText(parent.label||'親')}</span><span class="role-parent-time">${typeof fmt==='function'?fmt(parent.time):parent.time}</span><small>${count?`${count}子項目`:'親タイムスタンプ'}</small></button>`;
    }).join('')}</div>`;
    overview.prepend(box);
    const copy=overview.querySelector('.empty-copy');
    if(copy){
      const strong=copy.querySelector('strong'),span=copy.querySelector('span');
      if(strong)strong.textContent='大見出しはありません';
      if(span)span.textContent='親タイムスタンプから直接ジャンプできます。全件を時系列で見る場合は「すべて」を使ってください。';
    }
    box.querySelectorAll('[data-parent-time]').forEach(button=>button.addEventListener('click',()=>{
      const item=currentItem();if(!item)return;
      playItem(item.id,Number(button.dataset.parentTime)||0);
    }));
  }

  function polish(){
    const item=currentItem(),rows=item?.timestamps||[];
    if(!rows.length)return;
    enhanceRows(rows);
    enhanceParentOverview(rows);
  }

  const observer=new MutationObserver(()=>queueMicrotask(polish));
  observer.observe(view,{childList:true,subtree:true});
  polish();
})();
