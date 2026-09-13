// ASMRTube YouTube runtime — provider adapter loaded locally, provider API loaded on demand.
(function(){
  'use strict';

  let apiPromise=null;
  let playerPromise=null;
  let uiTimer=null;
  let requestSeq=0;

  const diag=(type,detail={})=>{try{window.asmrtubeDiagnostics?.record(type,detail)}catch{}};
  function showPlayerStatus(title,detail=''){
    const box=document.querySelector('#playerPlaceholder');if(!box)return;
    box.classList.remove('hidden');
    const titleEl=box.querySelector('strong'),detailEl=box.querySelector('span');
    if(titleEl)titleEl.textContent=title;if(detailEl)detailEl.textContent=detail;
  }
  function hidePlayerStatus(){document.querySelector('#playerPlaceholder')?.classList.add('hidden')}

  function loadApi(){
    if(window.YT?.Player)return Promise.resolve(window.YT);
    if(apiPromise)return apiPromise;
    apiPromise=new Promise((resolve,reject)=>{
      let settled=false;
      let script=document.querySelector('script[data-asmrtube-youtube-api]');
      const previousReady=window.onYouTubeIframeAPIReady;
      const finish=(ok,value)=>{
        if(settled)return;settled=true;clearTimeout(timeout);
        if(window.onYouTubeIframeAPIReady===ready)window.onYouTubeIframeAPIReady=previousReady||null;
        if(ok){diag('player.api.ready');resolve(value)}
        else{script?.remove();apiPromise=null;diag('player.api.failure',{message:value?.message||'unknown'});reject(value)}
      };
      const ready=()=>{try{previousReady?.()}catch{}finish(true,window.YT)};
      const timeout=setTimeout(()=>finish(false,new Error('YouTube IFrame API timeout')),10000);
      window.onYouTubeIframeAPIReady=ready;
      if(!script){
        script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.dataset.asmrtubeYoutubeApi='1';document.head.appendChild(script);
      }
      script.addEventListener('error',()=>finish(false,new Error('YouTube IFrame API load error')),{once:true});
    });
    return apiPromise;
  }

  function ensurePlayer(){
    if(state.player?.loadVideoById)return Promise.resolve(state.player);
    if(playerPromise)return playerPromise;
    showPlayerStatus('YouTubeプレイヤーを準備中…','YouTubeに接続できなくてもライブラリや設定は利用できます。');
    playerPromise=loadApi().then(()=>new Promise((resolve,reject)=>{
      let settled=false;
      const timeout=setTimeout(()=>{if(!settled){settled=true;reject(new Error('YouTube player initialization timeout'))}},10000);
      try{
        state.player=new YT.Player('ytPlayerHost',{
          height:'100%',width:'100%',videoId:'',playerVars:{playsinline:1,rel:0},
          events:{
            onReady:event=>{
              if(settled)return;settled=true;clearTimeout(timeout);event.target.setVolume(35);
              if(!uiTimer)uiTimer=setInterval(updatePlayerUi,400);
              diag('player.ready');resolve(state.player);
            },
            onStateChange:event=>{
              const playing=event.data===YT.PlayerState.PLAYING,button=document.querySelector('#playBtn');
              if(button)button.textContent=playing?'❚❚':'▶';
              if(event.data===YT.PlayerState.ENDED)step(1);
            },
            onError:event=>{diag('player.media.error',{code:event.data});toast('この動画をYouTubeプレイヤーで再生できませんでした')}
          }
        });
      }catch(error){clearTimeout(timeout);reject(error)}
    })).catch(error=>{
      try{state.player?.destroy?.()}catch{}
      state.player=null;playerPromise=null;
      showPlayerStatus('YouTubeプレイヤーを読み込めませんでした','通信やブロック設定を確認し、再生ボタンでもう一度試してください。');
      diag('player.init.failure',{message:error?.message||'unknown'});
      throw error;
    });
    return playerPromise;
  }

  function selectItem(item,{start=0}={}){
    if(!item)return false;
    const volume=document.querySelector('#volume');if(volume)volume.value=item.volume??35;
    if(state.player?.cueVideoById){
      hidePlayerStatus();state.player.setVolume(item.volume??35);
      if(state.currentId!==item.id)state.player.cueVideoById({videoId:item.videoId,startSeconds:Number(start)||0});
      state.currentId=item.id;
    }else{
      state.currentId=null;
      showPlayerStatus('再生ボタンでプレイヤーを準備します','YouTubeは再生するときだけ読み込みます。');
    }
    return true;
  }

  async function playItem(item,start=0){
    if(!item)return false;
    const request=++requestSeq;
    try{
      const player=await ensurePlayer();
      if(request!==requestSeq||state.selectedId!==item.id)return false;
      state.currentId=item.id;hidePlayerStatus();
      player.loadVideoById({videoId:item.videoId,startSeconds:Number(start)||0});player.setVolume(item.volume??35);
      renderSongList();renderSelection();
      return true;
    }catch{if(request===requestSeq)toast('YouTubeプレイヤーを読み込めませんでした');return false}
  }

  async function toggleSelected(item){
    if(!item)return false;
    if(!state.player||state.currentId!==item.id)return playItem(item,0);
    try{
      const playing=window.YT?.PlayerState&&state.player.getPlayerState()===window.YT.PlayerState.PLAYING;
      if(playing)state.player.pauseVideo();
      else{state.player.playVideo();markRecent(item.id)}
      return true;
    }catch{return playItem(item,0)}
  }
  function setVolume(value){try{state.player?.setVolume?.(Math.max(0,Math.min(100,Number(value)||0)))}catch{}}
  function stopIfCurrent(id){
    if(state.currentId!==id)return;
    requestSeq++;try{state.player?.stopVideo?.()}catch{}state.currentId=null;showPlayerStatus('ASMRを選択してください','選んだ作品をここで再生します');
  }
  function invalidateItem(id){
    if(state.currentId!==id)return;
    requestSeq++;try{state.player?.stopVideo?.()}catch{}state.currentId=null;showPlayerStatus('再生ボタンでプレイヤーを準備します','動画URLが変更されたため、新しい動画を読み込みます。');
  }
  function reset(){requestSeq++;try{state.player?.stopVideo?.()}catch{}state.currentId=null;showPlayerStatus('ASMRを選択してください','選んだ作品をここで再生します')}

  window.addEventListener('pagehide',()=>{if(uiTimer){clearInterval(uiTimer);uiTimer=null}},{once:true});
  window.asmrtubeYoutubeRuntime=Object.freeze({loadApi,ensurePlayer,selectItem,playItem,toggleSelected,setVolume,stopIfCurrent,invalidateItem,reset});
})();
