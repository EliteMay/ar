// ASMRTube v3.0.1 reliability patch — load YouTube only when playback is requested.
(function(){
  'use strict';

  let apiPromise=null;
  let playerPromise=null;
  let uiTimer=null;
  let requestSeq=0;

  function showPlayerStatus(title,detail=''){
    const box=document.querySelector('#playerPlaceholder');
    if(!box)return;
    box.classList.remove('hidden');
    const titleEl=box.querySelector('strong');
    const detailEl=box.querySelector('span');
    if(titleEl)titleEl.textContent=title;
    if(detailEl)detailEl.textContent=detail;
  }

  function loadApi(){
    if(window.YT?.Player)return Promise.resolve(window.YT);
    if(apiPromise)return apiPromise;

    apiPromise=new Promise((resolve,reject)=>{
      let settled=false;
      let script=document.querySelector('script[data-asmrtube-youtube-api]');
      const finish=(ok,value)=>{
        if(settled)return;
        settled=true;
        clearTimeout(timeout);
        if(ok)resolve(value);
        else{
          script?.remove();
          apiPromise=null;
          reject(value);
        }
      };

      const timeout=setTimeout(()=>finish(false,new Error('YouTube IFrame API timeout')),10000);
      window.onYouTubeIframeAPIReady=()=>finish(true,window.YT);

      if(!script){
        script=document.createElement('script');
        script.src='https://www.youtube.com/iframe_api';
        script.async=true;
        script.dataset.asmrtubeYoutubeApi='1';
        document.head.appendChild(script);
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
      const timeout=setTimeout(()=>{
        if(settled)return;
        settled=true;
        reject(new Error('YouTube player initialization timeout'));
      },10000);

      try{
        state.player=new YT.Player('ytPlayerHost',{
          height:'100%',
          width:'100%',
          videoId:'',
          playerVars:{playsinline:1,rel:0},
          events:{
            onReady:event=>{
              if(settled)return;
              settled=true;
              clearTimeout(timeout);
              event.target.setVolume(35);
              if(!uiTimer)uiTimer=setInterval(updatePlayerUi,400);
              resolve(state.player);
            },
            onStateChange:event=>{
              const playing=event.data===YT.PlayerState.PLAYING;
              const button=document.querySelector('#playBtn');
              if(button)button.textContent=playing?'❚❚':'▶';
              if(event.data===YT.PlayerState.ENDED)step(1);
            },
            onError:()=>toast('この動画をYouTubeプレイヤーで再生できませんでした')
          }
        });
      }catch(error){
        clearTimeout(timeout);
        reject(error);
      }
    })).catch(error=>{
      try{state.player?.destroy?.()}catch{}
      state.player=null;
      playerPromise=null;
      showPlayerStatus('YouTubeプレイヤーを読み込めませんでした','通信やブロック設定を確認し、再生ボタンでもう一度試してください。');
      throw error;
    });

    return playerPromise;
  }

  const baseSelectItem=selectItem;
  selectItem=function(id,{play=false,start=0}={}){
    const item=itemById(id);
    if(!item)return;

    state.selectedId=id;
    const volume=document.querySelector('#volume');
    if(volume)volume.value=item.volume??35;

    if(state.player?.cueVideoById){
      document.querySelector('#playerPlaceholder')?.classList.add('hidden');
      state.player.setVolume(item.volume??35);
      if(play)return playItem(id,start);
      if(state.currentId!==id)state.player.cueVideoById({videoId:item.videoId,startSeconds:start});
      state.currentId=id;
    }else{
      state.currentId=null;
      showPlayerStatus('再生ボタンでプレイヤーを準備します','YouTubeは再生するときだけ読み込みます。');
      if(play)playItem(id,start);
    }

    renderSongList();
    renderSelection();
  };

  playItem=async function(id,start=0){
    const item=itemById(id);
    if(!item)return;

    const request=++requestSeq;
    state.selectedId=id;
    const volume=document.querySelector('#volume');
    if(volume)volume.value=item.volume??35;
    renderSongList();
    renderSelection();

    try{
      const player=await ensurePlayer();
      if(request!==requestSeq||state.selectedId!==id)return;
      state.currentId=id;
      document.querySelector('#playerPlaceholder')?.classList.add('hidden');
      player.loadVideoById({videoId:item.videoId,startSeconds:start});
      player.setVolume(item.volume??35);
      markRecent(id);
      renderSongList();
      renderSelection();
    }catch{
      if(request===requestSeq)toast('YouTubeプレイヤーを読み込めませんでした');
    }
  };

  const playButton=document.querySelector('#playBtn');
  if(playButton){
    playButton.onclick=()=>{
      const item=itemById(state.selectedId);
      if(!item)return;
      if(!state.player||state.currentId!==item.id)return playItem(item.id);
      const isPlaying=window.YT?.PlayerState&&state.player.getPlayerState()===window.YT.PlayerState.PLAYING;
      if(isPlaying)state.player.pauseVideo();
      else state.player.playVideo();
    };
  }

  // Keep the original function reachable for diagnostics without using it for normal playback.
  window.asmrtubeYoutubeRuntime={ensurePlayer,loadApi,baseSelectItem};
})();
