// ASMRTube core data utilities — URL parsing and import normalization.
(function(){
  'use strict';

  const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
  const SAFE_ID=/^[A-Za-z0-9._:-]{1,160}$/;
  const MAX_LIBRARY=5000;
  const MAX_PLAYLISTS=500;
  const MAX_TIMESTAMPS_PER_ITEM=10000;
  const MAX_TAGS_PER_ITEM=100;
  const MAX_FAVORITE_SECTIONS=1000;

  const text=(value,max=300)=>String(value??'').trim().slice(0,max);
  const finiteNumber=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const uniqueStrings=(values,maxItems=MAX_TAGS_PER_ITEM,maxLength=80)=>{
    const out=[];
    for(const value of Array.isArray(values)?values:[]){
      const item=text(value,maxLength);
      if(item&&!out.includes(item))out.push(item);
      if(out.length>=maxItems)break;
    }
    return out;
  };

  function isYoutubeHost(hostname){
    const host=String(hostname||'').toLowerCase().replace(/\.$/,'');
    return host==='youtube.com'||host.endsWith('.youtube.com')||host==='youtube-nocookie.com'||host.endsWith('.youtube-nocookie.com');
  }

  function youtubeVideoId(input){
    try{
      const url=new URL(String(input||'').trim());
      if(url.protocol!=='https:'&&url.protocol!=='http:')return null;
      const host=url.hostname.toLowerCase().replace(/\.$/,'');
      let candidate='';
      if(host==='youtu.be')candidate=url.pathname.split('/').filter(Boolean)[0]||'';
      else if(isYoutubeHost(host)){
        const parts=url.pathname.split('/').filter(Boolean);
        if(parts[0]==='shorts'||parts[0]==='live'||parts[0]==='embed')candidate=parts[1]||'';
        else candidate=url.searchParams.get('v')||'';
      }else return null;
      return VIDEO_ID.test(candidate)?candidate:null;
    }catch{return null}
  }

  function canonicalYoutubeUrl(videoId){
    return VIDEO_ID.test(String(videoId||''))?`https://www.youtube.com/watch?v=${videoId}`:'';
  }

  function safeId(value,makeId){
    const source=text(value,160);
    return SAFE_ID.test(source)?source:makeId();
  }

  function sanitizeTimestamp(value){
    if(!value||typeof value!=='object')return null;
    const time=Number(value.time);
    if(!Number.isFinite(time)||time<0)return null;
    const row={
      time,
      label:text(value.label,240)||'タイムスタンプ',
      tags:uniqueStrings(value.tags,50,80)
    };
    const group=text(value.group,120);if(group)row.group=group;
    const subtitle=text(value.subtitle,240);if(subtitle)row.subtitle=subtitle;
    const role=['item','parent','child'].includes(value.role)?value.role:'item';
    if(role!=='item')row.role=role;
    const depth=Number(value.depth);if(Number.isInteger(depth)&&depth>=0&&depth<=8)row.depth=depth;
    const confidence=Number(value.confidence);if(Number.isFinite(confidence))row.confidence=clamp(confidence,0,1);
    const sourceStyle=text(value.sourceStyle,40);if(sourceStyle)row.sourceStyle=sourceStyle;
    const parentTime=Number(value.parentTime);if(Number.isFinite(parentTime)&&parentTime>=0)row.parentTime=parentTime;
    const parentLabel=text(value.parentLabel,240);if(parentLabel)row.parentLabel=parentLabel;
    const editedAt=Number(value.editedAt);if(Number.isFinite(editedAt)&&editedAt>0)row.editedAt=editedAt;
    return row;
  }

  function sanitizeFavoriteSection(value,makeId){
    if(!value||typeof value!=='object')return null;
    const start=Number(value.start),end=Number(value.end);
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)return null;
    return {
      id:safeId(value.id,makeId),
      label:text(value.label,120)||'お気に入り区間',
      start,
      end,
      createdAt:Number.isFinite(Number(value.createdAt))?Number(value.createdAt):Date.now()
    };
  }

  function prepareImportedData(data,{makeId}={}){
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('バックアップ形式が正しくありません');
    if(!Array.isArray(data.library))throw new Error('library がありません');
    if(data.library.length>MAX_LIBRARY)throw new Error(`ASMR件数が上限 ${MAX_LIBRARY} 件を超えています`);
    const idFactory=typeof makeId==='function'?makeId:()=>`imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const seenVideos=new Set(),seenIds=new Set(),idMap=new Map();
    const library=[];let invalid=0,duplicates=0;

    for(const raw of data.library){
      if(!raw||typeof raw!=='object'||Array.isArray(raw)){invalid++;continue}
      const videoId=VIDEO_ID.test(String(raw.videoId||''))?String(raw.videoId):youtubeVideoId(raw.url);
      const title=text(raw.title,300);
      if(!videoId||!title){invalid++;continue}
      if(seenVideos.has(videoId)){duplicates++;continue}

      const sourceId=text(raw.id,160);
      let id=safeId(sourceId,idFactory);
      while(seenIds.has(id))id=idFactory();
      seenIds.add(id);seenVideos.add(videoId);
      if(sourceId&&!idMap.has(sourceId))idMap.set(sourceId,id);

      const item={
        id,
        url:canonicalYoutubeUrl(videoId),
        videoId,
        title,
        creator:text(raw.creator,220),
        tags:uniqueStrings(raw.tags),
        rating:clamp(Math.round(finiteNumber(raw.rating,0)),0,4),
        volume:clamp(Math.round(finiteNumber(raw.volume,35)),0,100),
        sleepFriendly:!!raw.sleepFriendly,
        favorite:!!raw.favorite,
        timestamps:(Array.isArray(raw.timestamps)?raw.timestamps:[]).slice(0,MAX_TIMESTAMPS_PER_ITEM).map(sanitizeTimestamp).filter(Boolean),
        createdAt:Number.isFinite(Number(raw.createdAt))?Number(raw.createdAt):Date.now()
      };
      if(Number.isFinite(Number(raw.updatedAt)))item.updatedAt=Number(raw.updatedAt);
      if(Number.isFinite(Number(raw.resumeAt))&&Number(raw.resumeAt)>=0)item.resumeAt=Number(raw.resumeAt);
      if(Number.isFinite(Number(raw.resumeDuration))&&Number(raw.resumeDuration)>0)item.resumeDuration=Number(raw.resumeDuration);
      if(Number.isFinite(Number(raw.resumeUpdatedAt)))item.resumeUpdatedAt=Number(raw.resumeUpdatedAt);
      const sections=(Array.isArray(raw.favoriteSections)?raw.favoriteSections:[]).slice(0,MAX_FAVORITE_SECTIONS).map(section=>sanitizeFavoriteSection(section,idFactory)).filter(Boolean);
      if(sections.length)item.favoriteSections=sections;
      library.push(item);
    }

    const validIds=new Set(library.map(item=>item.id));
    const sourcePlaylists=Array.isArray(data.playlists)?data.playlists:[];
    if(sourcePlaylists.length>MAX_PLAYLISTS)throw new Error(`プレイリスト件数が上限 ${MAX_PLAYLISTS} 件を超えています`);
    const playlistIds=new Set();
    const playlists=sourcePlaylists.filter(p=>p&&typeof p==='object'&&!Array.isArray(p)).map(raw=>{
      let id=safeId(raw.id,idFactory);while(playlistIds.has(id))id=idFactory();playlistIds.add(id);
      const items=[...new Set((Array.isArray(raw.items)?raw.items:[]).map(value=>idMap.get(String(value))||String(value)).filter(idValue=>validIds.has(idValue)))];
      return {id,name:text(raw.name,80)||'プレイリスト',items};
    });
    const recent=[...new Set((Array.isArray(data.recent)?data.recent:[]).map(value=>idMap.get(String(value))||String(value)).filter(id=>validIds.has(id)))].slice(0,50);
    return {library,playlists,recent,invalid,duplicates};
  }

  window.ASMRTubeCore=Object.freeze({
    VIDEO_ID,
    youtubeVideoId,
    canonicalYoutubeUrl,
    prepareImportedData,
    sanitizeTimestamp,
    sanitizeFavoriteSection
  });
})();
