const STORAGE_KEY='asmrtube.library.v1';
const DEFAULT_TAGS=['耳かき','梵天','囁き','吐息','オノマトペ','タッピング','マッサージ','添い寝','ロールプレイ','睡眠'];
const EAR_TAGS=['右耳','左耳','両耳','交互'];
const state={library:[],playlists:[],recent:[],selectedId:null,currentView:'all',currentPlaylist:null,query:'',filters:new Set(),player:null,currentId:null,duration:0,loopA:null,loopB:null,sleepTimer:null,parsedTimestamps:[]};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify({library:state.library,playlists:state.playlists,recent:state.recent}))}
function load(){try{const d=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');state.library=Array.isArray(d.library)?d.library:[];state.playlists=Array.isArray(d.playlists)?d.playlists:[];state.recent=Array.isArray(d.recent)?d.recent:[]}catch{toast('保存データを読み込めませんでした')}}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function ytId(url){try{const u=new URL(url.trim());if(u.hostname.includes('youtu.be'))return u.pathname.slice(1).split('/')[0];if(u.hostname.includes('youtube.com')){if(u.pathname.startsWith('/shorts/'))return u.pathname.split('/')[2];return u.searchParams.get('v')}}catch{}const m=String(url).match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);return m?.[1]||null}
function thumb(id){return id?`https://i.ytimg.com/vi/${id}/hqdefault.jpg`:''}
function fmt(sec){sec=Math.max(0,Math.floor(Number(sec)||0));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`}
function parseTime(t){const p=String(t).trim().split(':').map(Number);if(p.some(Number.isNaN))return null;if(p.length===2)return p[0]*60+p[1];if(p.length===3)return p[0]*3600+p[1]*60+p[2];return null}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function attr(s){return esc(s)}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2200)}
function ratingLabel(n){return ['未評価','普通','好き','かなり好き','神'][Number(n)||0]}
function tagList(v){return String(v||'').split(/[,、]/).map(s=>s.trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i)}
function itemById(id){return state.library.find(x=>x.id===id)}
function allTags(){return [...new Set([...DEFAULT_TAGS,...EAR_TAGS,...state.library.flatMap(x=>x.tags||[])])].sort((a,b)=>a.localeCompare(b,'ja'))}

function filtered(){
  let a=[...state.library];
  if(state.currentView==='favorites')a=a.filter(x=>x.favorite);
  if(state.currentView==='recent')a=state.recent.map(id=>itemById(id)).filter(Boolean);
  if(state.currentView==='sleep')a=a.filter(x=>x.sleepFriendly||x.tags?.includes('睡眠'));
  if(state.currentView==='playlist'){
    const p=state.playlists.find(p=>p.id===state.currentPlaylist);
    a=(p?.items||[]).map(id=>itemById(id)).filter(Boolean);
  }
  if(state.query){const q=state.query.toLowerCase();a=a.filter(x=>[x.title,x.creator,...(x.tags||[])].join(' ').toLowerCase().includes(q))}
  if(state.filters.size)a=a.filter(x=>[...state.filters].every(t=>x.tags?.includes(t)));
  const s=$('#sortSelect')?.value||'new';
  if(s==='title')a.sort((x,y)=>x.title.localeCompare(y.title,'ja'));
  else if(s==='rating')a.sort((x,y)=>(y.rating||0)-(x.rating||0));
  else if(state.currentView!=='recent')a.sort((x,y)=>(y.createdAt||0)-(x.createdAt||0));
  return a;
}

function renderCounts(){
  $('#countAll').textContent=state.library.length;
  $('#countFav').textContent=state.library.filter(x=>x.favorite).length;
  $('#countRecent').textContent=state.recent.filter(id=>itemById(id)).length;
  $('#countSleep').textContent=state.library.filter(x=>x.sleepFriendly||x.tags?.includes('睡眠')).length;
}

function renderFilters(){
  $('#earFilters').innerHTML=EAR_TAGS.map(tag=>chipHtml(tag)).join('');
  $('#typeFilters').innerHTML=allTags().filter(t=>!EAR_TAGS.includes(t)).map(tag=>chipHtml(tag)).join('');
  $$('.filter-chip').forEach(b=>b.onclick=()=>{state.filters.has(b.dataset.tag)?state.filters.delete(b.dataset.tag):state.filters.add(b.dataset.tag);renderFilters();renderSongList()});
}
function chipHtml(tag){return `<button class="chip filter-chip ${state.filters.has(tag)?'active':''}" data-tag="${attr(tag)}">${esc(tag)}</button>`}

function renderPlaylists(){
  const box=$('#playlistList');
  box.innerHTML=state.playlists.map(p=>`<button class="playlist-item ${state.currentView==='playlist'&&state.currentPlaylist===p.id?'active':''}" data-id="${p.id}">${esc(p.name)} (${p.items.length})</button>`).join('');
  [...box.children].forEach(b=>b.onclick=()=>{
    state.currentView='playlist';state.currentPlaylist=b.dataset.id;
    $$('.view-btn').forEach(n=>n.classList.remove('active'));
    renderAll();
  });
}

function songHtml(x){return `<button class="song-item ${state.selectedId===x.id?'active':''}" data-id="${x.id}"><span class="thumb"><img src="${thumb(x.videoId)}" alt=""></span><span class="song-meta"><strong>${esc(x.title)}</strong><span>${esc(x.creator||'配信者未設定')}</span></span><span class="favorite-mark">${x.favorite?'★':''}</span></button>`}
function renderSongList(){
  const a=filtered();
  $('#resultCount').textContent=a.length;
  $('#songList').innerHTML=a.map(songHtml).join('');
  $('#emptyState').classList.toggle('hidden',a.length>0||state.library.length>0);
  $$('.song-item').forEach(b=>b.onclick=()=>selectItem(b.dataset.id));
  renderCounts();
}

function currentViewLabel(){
  if(state.currentView==='favorites')return 'FAVORITES';
  if(state.currentView==='recent')return 'RECENTLY PLAYED';
  if(state.currentView==='sleep')return 'SLEEP ASMR';
  if(state.currentView==='playlist')return 'PLAYLIST';
  return 'ASMR LIBRARY';
}

function selectItem(id,{play=false,start=0}={}){
  const x=itemById(id);if(!x)return;
  state.selectedId=id;
  $('#playerPlaceholder').classList.add('hidden');
  $('#volume').value=x.volume??35;
  if(state.player){
    state.player.setVolume(x.volume??35);
    if(play){state.player.loadVideoById({videoId:x.videoId,startSeconds:start});markRecent(id)}
    else if(state.currentId!==id){state.player.cueVideoById({videoId:x.videoId,startSeconds:start})}
  }
  state.currentId=id;
  renderSongList();renderSelection();
}

function renderSelection(){
  const x=itemById(state.selectedId);
  $('#viewEyebrow').textContent=currentViewLabel();
  if(!x){
    $('#nowTitle').textContent='ASMRを選択';$('#nowCreator').textContent='左のライブラリから選んでください';
    $('#topFavBtn').disabled=true;$('#topEditBtn').disabled=true;$('#timestampImportBtn').disabled=true;
    $('#infoCard').innerHTML='<div class="info-empty">ASMRを選ぶと作品情報が表示されます</div>';
    renderTimestamps();return;
  }
  $('#nowTitle').textContent=x.title;$('#nowCreator').textContent=x.creator||'配信者未設定';
  $('#topFavBtn').disabled=false;$('#topEditBtn').disabled=false;$('#timestampImportBtn').disabled=false;
  $('#topFavBtn').textContent=`${x.favorite?'★':'☆'} お気に入り`;
  $('#infoCard').innerHTML=`<div class="info-title-row"><div class="info-title"><h3>${esc(x.title)}</h3><p>${esc(x.creator||'配信者未設定')}</p></div><span class="info-rating">${ratingLabel(x.rating)}</span></div><div class="tag-row">${(x.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')||'<span class="muted small">タグ未設定</span>'}</div><div class="info-actions"><button class="primary-soft" id="infoPlay">▶ 再生</button><button class="ghost-btn" id="infoImport">コメントからタイムスタンプ</button><button class="ghost-btn" id="infoPlaylist">プレイリストへ</button><button class="danger-btn" id="infoDelete">削除</button></div>`;
  $('#infoPlay').onclick=()=>playItem(x.id);
  $('#infoImport').onclick=openTimestampDialog;
  $('#infoPlaylist').onclick=()=>addToPlaylistPrompt(x.id);
  $('#infoDelete').onclick=()=>deleteItem(x.id);
  renderTimestamps();
}

function renderTimestamps(){
  const x=itemById(state.selectedId),view=$('#timestampView');
  const rows=x?.timestamps||[];
  if(!x||!rows.length){view.className='timestamp-view empty';view.innerHTML='<div class="empty-copy"><strong>タイムスタンプなし</strong><span>YouTubeコメント欄のタイムスタンプを丸ごと貼り付けて登録できます。</span></div>';return}
  rows.sort((a,b)=>a.time-b.time);
  view.className='timestamp-view';
  view.innerHTML=rows.map((t,i)=>`<div class="timestamp-row"><button class="timestamp-time" data-time="${t.time}">${fmt(t.time)}</button><div class="timestamp-copy"><strong>${esc(t.label)}</strong><div class="tag-row">${(t.tags||[]).map(z=>`<span class="tag">${esc(z)}</span>`).join('')}</div><div class="timestamp-index">#${i+1}</div></div><button class="timestamp-delete" data-index="${i}" title="削除">×</button></div>`).join('');
  $$('.timestamp-time').forEach(b=>b.onclick=()=>playItem(x.id,Number(b.dataset.time)));
  $$('.timestamp-delete').forEach(b=>b.onclick=()=>{x.timestamps.splice(Number(b.dataset.index),1);save();renderTimestamps();toast('タイムスタンプを削除しました')});
}

function renderAll(){renderPlaylists();renderFilters();renderSongList();renderSelection()}

function openVideoDialog(x=null){
  $('#videoDialogTitle').textContent=x?'ASMRを編集':'ASMRを追加';
  $('#editId').value=x?.id||'';$('#videoUrl').value=x?.url||'';$('#videoTitle').value=x?.title||'';$('#creator').value=x?.creator||'';$('#tags').value=(x?.tags||[]).join(', ');$('#rating').value=String(x?.rating||0);$('#itemVolume').value=String(x?.volume??35);$('#sleepFriendly').checked=!!x?.sleepFriendly;
  $('#videoDialog').showModal();
}
function saveVideo(e){
  e.preventDefault();
  const url=$('#videoUrl').value.trim(),videoId=ytId(url);if(!videoId)return toast('有効なYouTube URLを入力してください');
  const editId=$('#editId').value,dup=state.library.find(x=>x.videoId===videoId&&x.id!==editId);if(dup)return toast(`「${dup.title}」として登録済みです`);
  const data={url,videoId,title:$('#videoTitle').value.trim(),creator:$('#creator').value.trim(),tags:tagList($('#tags').value),rating:Number($('#rating').value),volume:Math.min(100,Math.max(0,Number($('#itemVolume').value)||35)),sleepFriendly:$('#sleepFriendly').checked};
  if(editId){const x=itemById(editId);Object.assign(x,data,{updatedAt:Date.now()});state.selectedId=x.id}
  else{const x={id:uid(),favorite:false,timestamps:[],createdAt:Date.now(),...data};state.library.push(x);state.selectedId=x.id}
  save();$('#videoDialog').close();renderAll();selectItem(state.selectedId);toast('保存しました');
}
function deleteItem(id){
  const x=itemById(id);if(!x||!confirm(`「${x.title}」を削除しますか？`))return;
  state.library=state.library.filter(v=>v.id!==id);state.playlists.forEach(p=>p.items=p.items.filter(v=>v!==id));state.recent=state.recent.filter(v=>v!==id);
  if(state.selectedId===id)state.selectedId=null;if(state.currentId===id)state.currentId=null;
  save();renderAll();toast('削除しました');
}
function toggleFavorite(){const x=itemById(state.selectedId);if(!x)return;x.favorite=!x.favorite;save();renderAll()}

function parseTimestampText(text){
  const out=[];
  for(const raw of String(text).split(/\r?\n/)){
    const line=raw.trim();
    const m=line.match(/(?:^|\s)(\d{1,2}:\d{2}(?::\d{2})?)(?:\s+|[-–—｜|:：]\s*)(.*)$/);if(!m)continue;
    const time=parseTime(m[1]);if(time==null)continue;
    let label=(m[2]||'').trim().replace(/^[-–—｜|:：]+\s*/,'');if(!label)label='タイムスタンプ';
    out.push({time,label,tags:guessTags(label)});
  }
  return out.filter((v,i,a)=>a.findIndex(z=>z.time===v.time&&z.label===v.label)===i).sort((a,b)=>a.time-b.time);
}
function guessTags(label){const rules=[['耳かき','耳かき'],['梵天','梵天'],['囁','囁き'],['吐息','吐息'],['オノマトペ','オノマトペ'],['タッピング','タッピング'],['マッサージ','マッサージ'],['添い寝','添い寝'],['睡眠','睡眠'],['右耳','右耳'],['左耳','左耳'],['両耳','両耳'],['交互','交互']];return rules.filter(([k])=>label.includes(k)).map(([,v])=>v)}
function openTimestampDialog(){if(!state.selectedId)return;state.parsedTimestamps=[];$('#timestampPaste').value='';$('#timestampPreview').innerHTML='';$('#parseSummary').textContent='';$('#saveTimestampsBtn').disabled=true;$('#timestampDialog').showModal()}
function showTimestampPreview(){
  const rows=state.parsedTimestamps;$('#parseSummary').textContent=`${rows.length}件検出しました`;
  $('#timestampPreview').innerHTML=rows.map((t,i)=>`<div class="preview-row"><input aria-label="時間" data-i="${i}" data-k="time" value="${fmt(t.time)}"><input aria-label="内容" data-i="${i}" data-k="label" value="${attr(t.label)}"></div>`).join('');
  $('#saveTimestampsBtn').disabled=!rows.length;
  $$('#timestampPreview input').forEach(el=>el.onchange=()=>{const i=Number(el.dataset.i);if(el.dataset.k==='time'){const n=parseTime(el.value);if(n!=null)state.parsedTimestamps[i].time=n}else{state.parsedTimestamps[i].label=el.value.trim()||'タイムスタンプ';state.parsedTimestamps[i].tags=guessTags(state.parsedTimestamps[i].label)}});
}
function saveParsedTimestamps(){
  const x=itemById(state.selectedId);if(!x)return;x.timestamps=x.timestamps||[];
  for(const t of state.parsedTimestamps){if(!x.timestamps.some(z=>z.time===t.time&&z.label===t.label))x.timestamps.push(t)}
  x.timestamps.sort((a,b)=>a.time-b.time);save();$('#timestampDialog').close();renderTimestamps();renderFilters();toast('タイムスタンプを追加しました');
}

function markRecent(id){state.recent=[id,...state.recent.filter(v=>v!==id)].slice(0,50);save();renderCounts()}
function playItem(id,start=0){
  const x=itemById(id);if(!x)return;
  state.selectedId=id;state.currentId=id;markRecent(id);$('#playerPlaceholder').classList.add('hidden');$('#volume').value=x.volume??35;
  if(state.player?.loadVideoById){state.player.loadVideoById({videoId:x.videoId,startSeconds:start});state.player.setVolume(x.volume??35)}else toast('YouTubeプレイヤーを準備中です');
  renderSongList();renderSelection();
}
function queue(){return filtered()}
function step(dir){const q=queue();if(!q.length)return;let i=q.findIndex(x=>x.id===state.currentId);i=i<0?0:(i+dir+q.length)%q.length;playItem(q[i].id)}
function updatePlayerUi(){
  if(!state.player?.getCurrentTime)return;
  const t=state.player.getCurrentTime()||0,d=state.player.getDuration()||0;state.duration=d;$('#timeNow').textContent=fmt(t);$('#timeTotal').textContent=fmt(d);if(d)$('#seek').value=Math.round(t/d*1000);
  if(state.loopA!=null&&state.loopB!=null&&t>=state.loopB)state.player.seekTo(state.loopA,true);
}
function resetLoop(){state.loopA=null;state.loopB=null;$('#loopBtn').textContent='A-B';$('#loopBtn').classList.remove('active');$('#loopStatus').textContent='区間リピート: OFF';$('#loopStatus').classList.remove('active')}

function addToPlaylistPrompt(id){
  if(!state.playlists.length)return toast('先にプレイリストを作成してください');
  const names=state.playlists.map((p,i)=>`${i+1}: ${p.name}`).join('\n');const n=Number(prompt(`追加先の番号を入力してください\n${names}`)),p=state.playlists[n-1];if(!p)return;
  if(!p.items.includes(id))p.items.push(id);save();renderPlaylists();toast(`${p.name}に追加しました`);
}
function exportJson(){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),library:state.library,playlists:state.playlists,recent:state.recent},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`asmrtube_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)}
function importJson(file){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.library))throw 0;state.library=d.library;state.playlists=Array.isArray(d.playlists)?d.playlists:[];state.recent=Array.isArray(d.recent)?d.recent:[];state.selectedId=state.library[0]?.id||null;save();renderAll();if(state.selectedId)selectItem(state.selectedId);toast('バックアップを読み込みました')}catch{toast('対応していないJSONです')}};r.readAsText(file)}

window.onYouTubeIframeAPIReady=()=>{
  state.player=new YT.Player('ytPlayerHost',{height:'100%',width:'100%',videoId:'',playerVars:{playsinline:1,rel:0},events:{onReady:e=>e.target.setVolume(35),onStateChange:e=>{const playing=e.data===YT.PlayerState.PLAYING;$('#playBtn').textContent=playing?'❚❚':'▶';if(e.data===YT.PlayerState.ENDED)step(1)}}});
  setInterval(updatePlayerUi,400);
};

$('#addVideoBtn').onclick=()=>openVideoDialog();$('#topAddBtn').onclick=()=>openVideoDialog();$('#emptyAddBtn').onclick=()=>openVideoDialog();$('#videoForm').onsubmit=saveVideo;
$('#topFavBtn').onclick=toggleFavorite;$('#topEditBtn').onclick=()=>{const x=itemById(state.selectedId);if(x)openVideoDialog(x)};
$('#filterBtn').onclick=()=>$('#filters').classList.toggle('hidden');$('#clearFiltersBtn').onclick=()=>{state.filters.clear();renderFilters();renderSongList()};
$('#searchInput').oninput=e=>{state.query=e.target.value.trim();renderSongList()};$('#sortSelect').onchange=renderSongList;
$$('.view-btn').forEach(b=>b.onclick=()=>{state.currentView=b.dataset.view;state.currentPlaylist=null;$$('.view-btn').forEach(n=>n.classList.toggle('active',n===b));renderAll()});
$('#timestampImportBtn').onclick=openTimestampDialog;$('#parseTimestampsBtn').onclick=()=>{state.parsedTimestamps=parseTimestampText($('#timestampPaste').value);showTimestampPreview()};$('#saveTimestampsBtn').onclick=saveParsedTimestamps;
$('#newPlaylistBtn').onclick=()=>{$('#playlistName').value='';$('#playlistDialog').showModal()};$('#playlistForm').onsubmit=e=>{e.preventDefault();const name=$('#playlistName').value.trim();if(!name)return;state.playlists.push({id:uid(),name,items:[]});save();$('#playlistDialog').close();renderPlaylists();toast('プレイリストを作成しました')};
$('#exportBtn').onclick=exportJson;$('#importInput').onchange=e=>{if(e.target.files[0])importJson(e.target.files[0]);e.target.value=''};
$('#playBtn').onclick=()=>{const x=itemById(state.selectedId);if(!x)return;if(state.currentId!==x.id)return playItem(x.id);if(state.player?.getPlayerState()===YT.PlayerState.PLAYING)state.player.pauseVideo();else state.player?.playVideo()};
$('#prevBtn').onclick=()=>step(-1);$('#nextBtn').onclick=()=>step(1);
$('#volume').oninput=e=>{state.player?.setVolume(Number(e.target.value));const x=itemById(state.currentId||state.selectedId);if(x){x.volume=Number(e.target.value);save()}};
$('#seek').oninput=e=>{if(state.duration)state.player?.seekTo(Number(e.target.value)/1000*state.duration,true)};
$('#loopBtn').onclick=()=>{if(!state.player||!state.selectedId)return;const t=state.player.getCurrentTime()||0;if(state.loopA==null){state.loopA=t;state.loopB=null;$('#loopBtn').textContent=`A ${fmt(t)}`;$('#loopStatus').textContent=`A: ${fmt(t)} / B: 未設定`;$('#loopStatus').classList.add('active');toast('A地点を設定しました')}else if(state.loopB==null){if(t<=state.loopA)return toast('B地点はAより後にしてください');state.loopB=t;$('#loopBtn').textContent='A-B ON';$('#loopBtn').classList.add('active');$('#loopStatus').textContent=`${fmt(state.loopA)} 〜 ${fmt(state.loopB)}`;toast('区間リピートを開始します')}else{resetLoop();toast('区間リピートを解除しました')}};
$('#sleepBtn').onclick=()=>$('#sleepDialog').showModal();
$$('[data-sleep]').forEach(b=>b.onclick=()=>{clearTimeout(state.sleepTimer);state.sleepTimer=null;const min=Number(b.dataset.sleep);if(min){state.sleepTimer=setTimeout(()=>{state.player?.pauseVideo();$('#sleepStatus').textContent='スリープ: 完了';toast('スリープタイマーで停止しました')},min*60000);$('#sleepStatus').textContent=`スリープ: ${min}分`;$('#sleepStatus').classList.add('active');toast(`${min}分後に停止します`)}else{$('#sleepStatus').textContent='スリープ: OFF';$('#sleepStatus').classList.remove('active');toast('スリープタイマーを解除しました')}});

load();renderAll();if(state.library.length){state.selectedId=state.library[0].id;renderAll()}